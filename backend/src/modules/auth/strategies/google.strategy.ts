import { Injectable, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { FirebaseService } from '../../../common/firebase/firebase.service';

interface AdminAccount {
  id: string;
  userId: string;
  permissions: string[];
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private firebase: FirebaseService) {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL = process.env.GOOGLE_CALLBACK_URL;

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error(
        'Missing required Google OAuth env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<{ userId: string; adminAccountId: string; type: 'admin'; permissions: string[] }> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new ForbiddenException('No email in Google profile');
    }

    const snapshot = await this.firebase.db
      .collection('adminAccounts')
      .where('googleEmail', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new ForbiddenException('Not an authorized admin');
    }

    const doc = snapshot.docs[0];
    const account = { id: doc.id, ...doc.data() } as AdminAccount & { googleEmail: string };

    return {
      userId: account.userId,
      adminAccountId: account.id,
      type: 'admin',
      permissions: account.permissions,
    };
  }
}
