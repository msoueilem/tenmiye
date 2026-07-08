import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Strategy, Profile } from 'passport-google-oauth20';
import { AppConfig } from '../../../common/config/app.config';
import { AdminAccount, AdminAccountDocument } from '../../admin-accounts/schemas/admin-account.schema';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @InjectModel(AdminAccount.name) private readonly adminAccounts: Model<AdminAccountDocument>,
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

    const account = await this.adminAccounts.findOne({ googleEmail: email }).lean();
    if (!account) throw new ForbiddenException('Not an authorized admin');

    return {
      userId: (account as { userId?: string }).userId ?? '',
      adminAccountId: String(account._id),
      type: 'admin' as const,
      permissions: (account as { permissions?: string[] }).permissions ?? [],
      googleEmail: email,
    };
  }
}
