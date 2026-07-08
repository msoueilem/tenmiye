import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { JoinRequest, JoinRequestSchema } from './schemas/join-request.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { Tier, TierSchema } from '../tiers/schemas/tier.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JoinRequest.name, schema: JoinRequestSchema },
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Tier.name, schema: TierSchema },
    ]),
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
})
export class RegistrationsModule {}
