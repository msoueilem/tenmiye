import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfig } from '../../common/config/app.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthScheduler } from './auth.scheduler';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
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
