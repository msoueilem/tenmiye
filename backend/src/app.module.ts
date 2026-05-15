import { Module } from '@nestjs/common';
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
import { FilesModule } from './modules/files/files.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MeModule } from './modules/me/me.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { MessagesModule } from './modules/messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    ScheduleModule.forRoot(),
    FirebaseModule,
    AuthModule,
    UsersModule,
    BoardsModule,
    ElectionsModule,
    FinanceModule,
    BlogModule,
    HealthModule,
    FilesModule,
    SettingsModule,
    MeModule,
    RegistrationsModule,
    MessagesModule,
  ],
})
export class AppModule {}
