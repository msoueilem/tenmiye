import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ElectionsService } from './elections.service';

@Injectable()
export class ElectionsScheduler {
  private readonly logger = new Logger(ElectionsScheduler.name);

  constructor(private readonly elections: ElectionsService) {}

  @Cron('*/5 * * * *')
  async handleDismissalWindowClose(): Promise<void> {
    try {
      await this.elections.autoConfirmExpiredDismissals();
    } catch (err: unknown) {
      this.logger.error('autoConfirmExpiredDismissals failed', err);
    }
  }

  @Cron('*/5 * * * *')
  async handleVotingWindowClose(): Promise<void> {
    try {
      await this.elections.autoCloseExpiredVoting();
    } catch (err: unknown) {
      this.logger.error('autoCloseExpiredVoting failed', err);
    }
  }
}
