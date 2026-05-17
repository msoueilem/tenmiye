import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CheckPhoneDto } from './dto/check-phone.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { AppConfig } from '../../common/config/app.config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private config: ConfigService<AppConfig, true>,
  ) {}

  // ─── Phone check (pre-login) ─────────────────────────────────────────────────

  @ApiOperation({ summary: 'Check if phone is a registered member and whether they have a password' })
  @Post('phone/check')
  checkPhone(@Body() dto: CheckPhoneDto) {
    return this.auth.checkPhone(dto.phone);
  }

  // ─── SMS OTP ────────────────────────────────────────────────────────────────

  @Throttle({ default: { ttl: 600_000, limit: 3 } })
  @ApiOperation({ summary: 'Send SMS OTP — returns sessionInfo' })
  @Post('phone/request-otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @ApiOperation({ summary: 'Verify SMS OTP — returns JWT + requiresPasswordSetup flag' })
  @Post('phone/verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.sessionInfo, dto.code);
  }

  // ─── Password ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Set password after first SMS login (one-time)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('phone/set-password')
  setPassword(@CurrentUser() user: JwtPayload, @Body() dto: SetPasswordDto) {
    return this.auth.setPassword(user.userId, dto.password);
  }

  @ApiOperation({ summary: 'Reset forgotten password — requires a fresh OTP verification' })
  @Post('phone/reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.sessionInfo, dto.code, dto.newPassword);
  }

  @ApiOperation({ summary: 'Login with phone + password (after password is set)' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.loginWithPassword(dto.phone, dto.password);
  }

  @ApiOperation({ summary: 'Exchange refresh token for a new token pair (rotates refresh token)' })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Logout — revokes the refresh token' })
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }

  // ─── Google OAuth ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Initiate Google Authentication' })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @ApiOperation({ summary: 'Google Authentication Callback — redirects to frontend with tokens' })
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @CurrentUser() user: { userId: string; type: 'admin'; permissions: string[] },
    @Res() res: Response,
  ) {
    const tokens = await this.auth.issueAdminSession(user);
    const frontendUrl = this.config.get('frontendUrl', { infer: true });
    const params = new URLSearchParams({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    res.redirect(`${frontendUrl}/admin/auth-callback?${params.toString()}`);
  }
}
