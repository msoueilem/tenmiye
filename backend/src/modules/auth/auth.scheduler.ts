import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuthService } from './auth.service';

@Injectable()
export class AuthScheduler {
  private readonly logger = new Logger(AuthScheduler.name);

  constructor(private readonly auth: AuthService) {}

  @Cron('0 3 * * *')
  async purgeExpiredTokens(): Promise<void> {
    try {
      const deleted = await this.auth.purgeExpiredRefreshTokens();
      this.logger.log(`purgeExpiredRefreshTokens: deleted ${deleted} expired tokens`);
    } catch (err: unknown) {
      this.logger.error('purgeExpiredRefreshTokens failed', err);
    }
  }
}
