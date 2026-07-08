import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfig } from '../../common/config/app.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthScheduler } from './auth.scheduler';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { AdminAccount, AdminAccountSchema } from '../admin-accounts/schemas/admin-account.schema';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';

@Module({
  imports: [
    PassportModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: AdminAccount.name, schema: AdminAccountSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        secret: config.get('jwt', { infer: true }).secret,
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthScheduler, GoogleStrategy, JwtStrategy],
})
export class AuthModule {}
