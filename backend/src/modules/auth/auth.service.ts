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
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { AppConfig } from '../../common/config/app.config';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';

const FIREBASE_PHONE_BASE = 'https://identitytoolkit.googleapis.com/v1/accounts';
const BCRYPT_ROUNDS = 12;
const COUNTRY_CODE = '+222';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type UserRow = {
  _id: Types.ObjectId;
  status: string;
  roleId?: string | null;
  passwordHash?: string | null;
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
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roles: Model<RoleDocument>,
    @InjectModel(RefreshToken.name) private readonly refreshTokens: Model<RefreshTokenDocument>,
  ) {}

  // ─── Phone check (pre-login) ─────────────────────────────────────────────────

  async checkPhone(phone: string): Promise<{ isMember: boolean; hasPassword: boolean }> {
    const user = await this.users.findOne({ phoneNumber: phone }).select('passwordHash').lean();
    if (!user) return { isMember: false, hasPassword: false };
    return { isMember: true, hasPassword: !!(user as { passwordHash?: string }).passwordHash };
  }

  // ─── SMS OTP ────────────────────────────────────────────────────────────────

  async requestOtp(phone: string): Promise<{ sessionInfo: string }> {
    const user = await this.users.findOne({ phoneNumber: phone }).select('status').lean();
    if (!user) throw new UnauthorizedException('Phone number is not registered');
    this.assertActive((user as { status: string }).status);

    const apiKey = this.config.get('firebase', { infer: true }).webApiKey;
    if (!apiKey) throw new InternalServerErrorException('FIREBASE_WEB_API_KEY is not configured');

    const res = await fetch(`${FIREBASE_PHONE_BASE}:sendVerificationCode?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: `${COUNTRY_CODE}${phone}`, recaptchaToken: 'ignored-for-test-numbers' }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new InternalServerErrorException(err?.error?.message ?? 'Failed to send SMS');
    }

    const data = (await res.json()) as { sessionInfo: string };
    this.log('OTP_REQUESTED', 'info', { phone });
    return { sessionInfo: data.sessionInfo };
  }

  async verifyOtp(sessionInfo: string, code: string): Promise<TokenPair & { requiresPasswordSetup: boolean }> {
    const localPhone = await this.exchangeOtp(sessionInfo, code);
    const user = await this.findUserByPhone(localPhone);
    this.assertActive(user.status);

    const permissions = await this.loadPermissions(user.roleId);
    const tokens = await this.issueTokenPair(String(user._id), permissions);
    await this.users.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    this.log('OTP_VERIFIED', 'info', { userId: String(user._id), phone: localPhone });
    return { ...tokens, requiresPasswordSetup: !user.passwordHash };
  }

  // ─── Password setup (first time, after OTP) ─────────────────────────────────

  async setPassword(userId: string, password: string): Promise<{ message: string }> {
    const user = Types.ObjectId.isValid(userId)
      ? ((await this.users.findById(userId).select('passwordHash').lean()) as UserRow | null)
      : null;
    if (!user) throw new NotFoundException('User not found');
    if (user.passwordHash) {
      throw new ConflictException('Password already set — use account recovery to change it');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.users.updateOne({ _id: user._id }, { $set: { passwordHash } });

    this.log('PASSWORD_SET', 'info', { userId });
    return { message: 'Password set successfully' };
  }

  // ─── Password reset (forgot password, via OTP) ───────────────────────────────

  async resetPassword(sessionInfo: string, code: string, newPassword: string): Promise<{ message: string }> {
    const localPhone = await this.exchangeOtp(sessionInfo, code);
    const user = await this.findUserByPhone(localPhone);
    this.assertActive(user.status);

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.users.updateOne({ _id: user._id }, { $set: { passwordHash } });

    this.log('PASSWORD_RESET', 'warn', { userId: String(user._id), phone: localPhone });
    return { message: 'Password reset successfully' };
  }

  // ─── Password login (subsequent logins) ─────────────────────────────────────

  async loginWithPassword(phone: string, password: string): Promise<TokenPair> {
    const user = await this.findUserByPhone(phone);
    this.assertActive(user.status);

    if (!user.passwordHash) {
      throw new UnauthorizedException('No password set — please log in with SMS OTP first');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      this.log('LOGIN_FAILED', 'warn', { phone, meta: { reason: 'WRONG_PASSWORD' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    const permissions = await this.loadPermissions(user.roleId);
    const tokens = await this.issueTokenPair(String(user._id), permissions);
    await this.users.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    this.log('LOGIN_SUCCESS', 'info', { userId: String(user._id), phone });
    return tokens;
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokens.findOne({ tokenHash });
    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.expiresAt.getTime() <= Date.now()) {
      await this.refreshTokens.deleteOne({ _id: stored._id });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate — delete old token, issue a new pair
    await this.refreshTokens.deleteOne({ _id: stored._id });

    const user = Types.ObjectId.isValid(stored.userId)
      ? ((await this.users.findById(stored.userId).select('status roleId').lean()) as UserRow | null)
      : null;
    if (!user) throw new UnauthorizedException('User not found');
    this.assertActive(user.status);

    const permissions = await this.loadPermissions(user.roleId);
    const tokens = await this.issueTokenPair(stored.userId, permissions);

    this.log('TOKEN_REFRESHED', 'info', { userId: stored.userId });
    return tokens;
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  async logout(refreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokens.findOneAndDelete({ tokenHash });
    if (stored) this.log('LOGOUT', 'info', { userId: stored.userId });
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.refreshTokens.deleteMany({ userId });
    this.log('LOGOUT_ALL', 'warn', { userId });
    return { message: 'All sessions terminated' };
  }

  async purgeExpiredRefreshTokens(): Promise<number> {
    const res = await this.refreshTokens.deleteMany({ expiresAt: { $lte: new Date() } });
    return res.deletedCount ?? 0;
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
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.refreshTokens.create({ userId, tokenHash, expiresAt });

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
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      const msg = err?.error?.message ?? '';
      if (msg.includes('INVALID_CODE') || msg.includes('SESSION_EXPIRED')) {
        const reason = msg.includes('SESSION_EXPIRED') ? 'SESSION_EXPIRED' : 'INVALID_CODE';
        this.log('OTP_FAILED', 'warn', { meta: { reason } });
        throw new UnauthorizedException('Invalid or expired OTP');
      }
      throw new InternalServerErrorException(msg || 'OTP verification failed');
    }

    // Firebase Phone Auth is retained for SMS only; verify the returned ID token.
    const { idToken } = (await res.json()) as { idToken: string };
    const decoded = await this.firebase.auth.verifyIdToken(idToken);
    const e164 = decoded.phone_number;
    if (!e164) throw new UnauthorizedException('Phone number not present in token');

    return e164.startsWith(COUNTRY_CODE) ? e164.slice(COUNTRY_CODE.length) : e164;
  }

  private async findUserByPhone(localPhone: string): Promise<UserRow> {
    const user = (await this.users
      .findOne({ phoneNumber: localPhone })
      .select('status roleId passwordHash')
      .lean()) as UserRow | null;
    if (!user) throw new NotFoundException(`No member found for phone ${localPhone}`);
    return user;
  }

  private assertActive(status: string, userId?: string): void {
    if (status !== 'active') {
      this.log('ACCOUNT_BLOCKED', 'warn', { userId, meta: { status } });
      throw new ForbiddenException('Account is not active — please wait for admin approval');
    }
  }

  private async loadPermissions(roleId?: string | null): Promise<string[]> {
    if (!roleId || !Types.ObjectId.isValid(roleId)) return [];
    const role = await this.roles.findById(roleId).select('permissions').lean();
    return (role as { permissions?: string[] })?.permissions ?? [];
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
    if (level === 'warn') this.logger.warn(payload);
    else this.logger.log(payload);
  }
}
