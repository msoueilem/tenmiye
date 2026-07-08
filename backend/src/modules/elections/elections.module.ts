import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ElectionsController } from './elections.controller';
import { ElectionsService } from './elections.service';
import { ElectionsScheduler } from './elections.scheduler';
import { Election, ElectionSchema } from './schemas/election.schema';
import { Vote, VoteSchema } from './schemas/vote.schema';
import { Nomination, NominationSchema } from './schemas/nomination.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Election.name, schema: ElectionSchema },
      { name: Vote.name, schema: VoteSchema },
      { name: Nomination.name, schema: NominationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ElectionsController],
  providers: [ElectionsService, ElectionsScheduler],
})
export class ElectionsModule {}
