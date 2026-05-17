import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { AppConfig } from '../../common/config/app.config';
import { JwtPayload } from '../../common/strategies/jwt.strategy';

const FIREBASE_PHONE_BASE = 'https://identitytoolkit.googleapis.com/v1/accounts';
const BCRYPT_ROUNDS = 12;
const COUNTRY_CODE = '+222';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type UserData = {
  status: string;
  roleId?: string;
  passwordHash?: string;
};

type TokenPair = {
  access_token: string;
  refresh_token: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private firebase: FirebaseService,
    private jwt: JwtService,
    private config: ConfigService<AppConfig, true>,
  ) {}

  // ─── Phone check (pre-login) ─────────────────────────────────────────────────

  async checkPhone(phone: string): Promise<{ isMember: boolean; hasPassword: boolean }> {
    const snapshot = await this.firebase.db
      .collection('users')
      .where('phoneNumber', '==', phone)
      .limit(1)
      .get();

    if (snapshot.empty) return { isMember: false, hasPassword: false };

    const data = snapshot.docs[0].data() as UserData;
    return { isMember: true, hasPassword: !!data.passwordHash };
  }

  // ─── SMS OTP ────────────────────────────────────────────────────────────────

  async requestOtp(phone: string): Promise<{ sessionInfo: string }> {
    // Reject early if the phone doesn't belong to an active member
    const snap = await this.firebase.db
      .collection('users')
      .where('phoneNumber', '==', phone)
      .limit(1)
      .get();
    if (snap.empty) throw new UnauthorizedException('Phone number is not registered');
    this.assertActive((snap.docs[0].data() as UserData).status);

    const apiKey = this.config.get('firebase', { infer: true }).webApiKey;
    if (!apiKey) throw new InternalServerErrorException('FIREBASE_WEB_API_KEY is not configured');

    const res = await fetch(`${FIREBASE_PHONE_BASE}:sendVerificationCode?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: `${COUNTRY_CODE}${phone}`, recaptchaToken: 'ignored-for-test-numbers' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new InternalServerErrorException(err?.error?.message ?? 'Failed to send SMS');
    }

    const data = await res.json() as { sessionInfo: string };
    this.log('OTP_REQUESTED', 'info', { phone });
    return { sessionInfo: data.sessionInfo };
  }

  async verifyOtp(
    sessionInfo: string,
    code: string,
  ): Promise<TokenPair & { requiresPasswordSetup: boolean }> {
    const localPhone = await this.exchangeOtp(sessionInfo, code);
    const userDoc = await this.findUserByPhone(localPhone);
    const data = userDoc.data() as UserData;

    this.assertActive(data.status);

    const permissions = await this.loadPermissions(data.roleId);
    const tokens = await this.issueTokenPair(userDoc.id, permissions);
    await userDoc.ref.update({ lastLoginAt: FieldValue.serverTimestamp() });

    this.log('OTP_VERIFIED', 'info', { userId: userDoc.id, phone: localPhone });
    return { ...tokens, requiresPasswordSetup: !data.passwordHash };
  }

  // ─── Password setup (first time, after OTP) ─────────────────────────────────

  async setPassword(userId: string, password: string): Promise<{ message: string }> {
    const userRef = this.firebase.db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) throw new NotFoundException('User not found');

    const data = userDoc.data() as UserData;
    if (data.passwordHash) {
      throw new ConflictException('Password already set — use account recovery to change it');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await userRef.update({ passwordHash });

    this.log('PASSWORD_SET', 'info', { userId });
    return { message: 'Password set successfully' };
  }

  // ─── Password reset (forgot password, via OTP) ───────────────────────────────

  async resetPassword(sessionInfo: string, code: string, newPassword: string): Promise<{ message: string }> {
    const localPhone = await this.exchangeOtp(sessionInfo, code);
    const userDoc = await this.findUserByPhone(localPhone);
    const data = userDoc.data() as UserData;

    this.assertActive(data.status);

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await userDoc.ref.update({ passwordHash, updatedAt: FieldValue.serverTimestamp() });

    this.log('PASSWORD_RESET', 'warn', { userId: userDoc.id, phone: localPhone });
    return { message: 'Password reset successfully' };
  }

  // ─── Password login (subsequent logins) ─────────────────────────────────────

  async loginWithPassword(phone: string, password: string): Promise<TokenPair> {
    const userDoc = await this.findUserByPhone(phone);
    const data = userDoc.data() as UserData;

    this.assertActive(data.status);

    if (!data.passwordHash) {
      throw new UnauthorizedException('No password set — please log in with SMS OTP first');
    }

    const valid = await bcrypt.compare(password, data.passwordHash);
    if (!valid) {
      this.log('LOGIN_FAILED', 'warn', { phone, meta: { reason: 'WRONG_PASSWORD' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    const permissions = await this.loadPermissions(data.roleId);
    const tokens = await this.issueTokenPair(userDoc.id, permissions);
    await userDoc.ref.update({ lastLoginAt: FieldValue.serverTimestamp() });

    this.log('LOGIN_SUCCESS', 'info', { userId: userDoc.id, phone });
    return tokens;
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);

    const snapshot = await this.firebase.db
      .collection('refreshTokens')
      .where('tokenHash', '==', tokenHash)
      .limit(1)
      .get();

    if (snapshot.empty) throw new UnauthorizedException('Invalid refresh token');

    const doc = snapshot.docs[0];
    const stored = doc.data() as { userId: string; expiresAt: Timestamp };

    if (stored.expiresAt.toMillis() <= Date.now()) {
      await doc.ref.delete();
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate — delete old token and issue a new pair
    await doc.ref.delete();

    const userDoc = await this.firebase.db.collection('users').doc(stored.userId).get();
    if (!userDoc.exists) throw new UnauthorizedException('User not found');

    const userData = userDoc.data() as UserData;
    this.assertActive(userData.status);

    const permissions = await this.loadPermissions(userData.roleId);
    const tokens = await this.issueTokenPair(stored.userId, permissions);

    this.log('TOKEN_REFRESHED', 'info', { userId: stored.userId });
    return tokens;
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  async logout(refreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(refreshToken);

    const snapshot = await this.firebase.db
      .collection('refreshTokens')
      .where('tokenHash', '==', tokenHash)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const userId = (snapshot.docs[0].data() as { userId: string }).userId;
      await snapshot.docs[0].ref.delete();
      this.log('LOGOUT', 'info', { userId });
    }

    return { message: 'Logged out successfully' };
  }

  // ─── Google OAuth ────────────────────────────────────────────────────────────

  async issueAdminSession(user: {
    userId: string;
    type: 'admin';
    permissions: string[];
    googleEmail: string;
  }): Promise<TokenPair> {
    return this.issueTokenPair(user.userId, user.permissions, user.googleEmail);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async issueTokenPair(userId: string, permissions: string[], googleEmail?: string): Promise<TokenPair> {
    const access_token = this.jwt.sign(this.buildPayload(userId, permissions, googleEmail));

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = Timestamp.fromMillis(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.firebase.db.collection('refreshTokens').add({
      userId,
      tokenHash,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { access_token, refresh_token: rawToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async exchangeOtp(sessionInfo: string, code: string): Promise<string> {
    const apiKey = this.config.get('firebase', { infer: true }).webApiKey;
    if (!apiKey) throw new InternalServerErrorException('FIREBASE_WEB_API_KEY is not configured');

    const res = await fetch(`${FIREBASE_PHONE_BASE}:signInWithPhoneNumber?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionInfo, code }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      const msg = err?.error?.message ?? '';
      if (msg.includes('INVALID_CODE') || msg.includes('SESSION_EXPIRED')) {
        const reason = msg.includes('SESSION_EXPIRED') ? 'SESSION_EXPIRED' : 'INVALID_CODE';
        this.log('OTP_FAILED', 'warn', { meta: { reason } });
        throw new UnauthorizedException('Invalid or expired OTP');
      }
      throw new InternalServerErrorException(msg || 'OTP verification failed');
    }

    const { idToken } = await res.json() as { idToken: string };
    const decoded = await this.firebase.auth.verifyIdToken(idToken);
    const e164 = decoded.phone_number;

    if (!e164) throw new UnauthorizedException('Phone number not present in token');

    return e164.startsWith(COUNTRY_CODE) ? e164.slice(COUNTRY_CODE.length) : e164;
  }

  private async findUserByPhone(localPhone: string) {
    const snapshot = await this.firebase.db
      .collection('users')
      .where('phoneNumber', '==', localPhone)
      .limit(1)
      .get();

    if (snapshot.empty) throw new NotFoundException(`No member found for phone ${localPhone}`);
    return snapshot.docs[0];
  }

  private assertActive(status: string, userId?: string): void {
    if (status !== 'active') {
      this.log('ACCOUNT_BLOCKED', 'warn', { userId, meta: { status } });
      throw new ForbiddenException('Account is not active — please wait for admin approval');
    }
  }

  private async loadPermissions(roleId?: string): Promise<string[]> {
    if (!roleId) return [];
    const roleDoc = await this.firebase.db.collection('roles').doc(roleId).get();
    if (!roleDoc.exists) return [];
    const data = roleDoc.data() as { permissions?: string[] };
    return data.permissions ?? [];
  }

  private buildPayload(userId: string, permissions: string[] = [], googleEmail?: string): JwtPayload {
    return {
      userId,
      type: googleEmail ? 'admin' : 'member',
      permissions,
      ...(googleEmail ? { googleEmail } : {}),
    };
  }

  private log(
    event: string,
    level: 'info' | 'warn',
    ctx: { userId?: string; phone?: string; meta?: Record<string, unknown> } = {},
  ): void {
    const payload = JSON.stringify({ event, ...ctx });
    if (level === 'warn') {
      this.logger.warn(payload);
    } else {
      this.logger.log(payload);
    }
  }
}
