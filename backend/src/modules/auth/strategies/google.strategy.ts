import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { FirebaseService } from '../../../common/firebase/firebase.service';
import { AppConfig } from '../../../common/config/app.config';

interface AdminAccount {
  id: string;
  userId: string;
  permissions: string[];
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private firebase: FirebaseService,
    config: ConfigService<AppConfig, true>,
  ) {
    const { clientId, clientSecret, callbackUrl } = config.get('google', { infer: true });

    if (!clientId || !clientSecret || !callbackUrl) {
      throw new Error(
        'Google OAuth requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL',
      );
    }

    super({ clientID: clientId, clientSecret, callbackURL: callbackUrl, scope: ['email', 'profile'] });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<{ userId: string; adminAccountId: string; type: 'admin'; permissions: string[]; googleEmail: string }> {
    const email = profile.emails?.[0]?.value;
    if (!email) throw new ForbiddenException('No email in Google profile');

    const snapshot = await this.firebase.db
      .collection('adminAccounts')
      .where('googleEmail', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) throw new ForbiddenException('Not an authorized admin');

    const doc = snapshot.docs[0];
    const account = { id: doc.id, ...doc.data() } as AdminAccount & { googleEmail: string };

    return {
      userId: account.userId,
      adminAccountId: account.id,
      type: 'admin' as const,
      permissions: account.permissions,
      googleEmail: email,
    };
  }
}
