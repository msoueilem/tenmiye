import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './common/config/app.config';
import { ScheduleModule } from '@nestjs/schedule';
import { FirebaseModule } from './common/firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BoardsModule } from './modules/boards/boards.module';
import { ElectionsModule } from './modules/elections/elections.module';
import { FinanceModule } from './modules/finance/finance.module';
import { BlogModule } from './modules/blog/blog.module';
import { HealthModule } from './modules/health/health.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MeModule } from './modules/me/me.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { MessagesModule } from './modules/messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    ScheduleModule.forRoot(),
    FirebaseModule,
    AuthModule,
    UsersModule,
    BoardsModule,
    ElectionsModule,
    FinanceModule,
    BlogModule,
    HealthModule,
    UploadsModule,
    SettingsModule,
    MeModule,
    RegistrationsModule,
    MessagesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
