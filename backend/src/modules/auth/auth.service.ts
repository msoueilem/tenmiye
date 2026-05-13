import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { JwtPayload } from '../../common/strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private firebase: FirebaseService,
    private jwt: JwtService,
  ) {}

  async requestOtp(phone: string): Promise<{ message: string }> {
    const snapshot = await this.firebase.db
      .collection('users')
      .where('whatsappNumber', '==', phone)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException('User not found');
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);

    await this.firebase.db.collection('whatsappOtps').doc(phone).set({
      code,
      used: false,
      expiresAt,
    });

    console.log('TODO: Send WhatsApp OTP', phone, code);

    return { message: 'OTP sent' };
  }

  async verifyOtp(phone: string, code: string): Promise<{ access_token: string }> {
    const otpDoc = await this.firebase.db.collection('whatsappOtps').doc(phone).get();

    if (!otpDoc.exists) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const otp = otpDoc.data() as { code: string; used: boolean; expiresAt: Timestamp };

    if (otp.used || otp.expiresAt.toMillis() <= Date.now() || otp.code !== code) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.firebase.db.collection('whatsappOtps').doc(phone).update({ used: true });

    const userSnapshot = await this.firebase.db
      .collection('users')
      .where('whatsappNumber', '==', phone)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const userDoc = userSnapshot.docs[0];
    const payload: JwtPayload = {
      userId: userDoc.id,
      type: 'member',
      permissions: [],
    };

    return { access_token: this.jwt.sign(payload) };
  }

  signJwt(user: JwtPayload): { access_token: string } {
    return { access_token: this.jwt.sign(user) };
  }
}
