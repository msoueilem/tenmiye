import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { UsersModule } from '../users/users.module';
import { FirebaseModule } from '../../common/firebase/firebase.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UsersModule, FirebaseModule, UploadsModule],
  controllers: [MeController],
})
export class MeModule {}
