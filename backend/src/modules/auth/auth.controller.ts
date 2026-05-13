import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtPayload } from '../../common/strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @ApiOperation({ summary: 'Request WhatsApp OTP' })
  @Post('whatsapp/request-otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @ApiOperation({ summary: 'Verify WhatsApp OTP and receive JWT' })
  @Post('whatsapp/verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code);
  }

  @ApiOperation({ summary: 'Initiate Google Authentication' })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // redirects to Google consent — handled by Passport
  }

  @ApiOperation({ summary: 'Google Authentication Callback' })
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: { user: JwtPayload }) {
    return this.auth.signJwt(req.user);
  }
}
