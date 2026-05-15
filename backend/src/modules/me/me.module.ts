import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { UsersModule } from '../users/users.module';
import { FirebaseModule } from '../../common/firebase/firebase.module';

@Module({
  imports: [UsersModule, FirebaseModule],
  controllers: [MeController],
})
export class MeModule {}
