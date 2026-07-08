import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MeController } from './me.controller';
import { UsersModule } from '../users/users.module';
import { UploadsModule } from '../uploads/uploads.module';
import { Vote, VoteSchema } from '../elections/schemas/vote.schema';
import { Election, ElectionSchema } from '../elections/schemas/election.schema';

@Module({
  imports: [
    UsersModule,
    UploadsModule,
    MongooseModule.forFeature([
      { name: Vote.name, schema: VoteSchema },
      { name: Election.name, schema: ElectionSchema },
    ]),
  ],
  controllers: [MeController],
})
export class MeModule {}
