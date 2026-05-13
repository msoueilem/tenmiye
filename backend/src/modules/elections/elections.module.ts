import { Module } from '@nestjs/common';
import { ElectionsController } from './elections.controller';
import { ElectionsService } from './elections.service';
import { ElectionsScheduler } from './elections.scheduler';

@Module({
  controllers: [ElectionsController],
  providers: [ElectionsService, ElectionsScheduler],
})
export class ElectionsModule {}
