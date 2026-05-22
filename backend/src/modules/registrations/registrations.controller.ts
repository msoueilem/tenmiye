import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { ReviewRegistrationDto } from './dto/review-registration.dto';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/strategies/jwt.strategy';

@ApiTags('registrations')
@Controller('registrations')
export class RegistrationsController {
  constructor(private registrations: RegistrationsService) {}

  @Throttle({ default: { ttl: 600_000, limit: 10 } })
  @ApiOperation({ summary: 'Submit a join request — no auth required' })
  @Post()
  create(@Body() dto: CreateRegistrationDto) {
    return this.registrations.create(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all join requests — admin only' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_REGISTRATIONS)
  @Get()
  findAll(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    return this.registrations.findAll(limit ? parseInt(limit, 10) : 20, cursor);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve or reject a join request — admin only',
    description:
      'Approving creates a Firebase Auth account and a users document automatically. ' +
      'Rejecting requires a rejectionReason.',
  })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_REGISTRATIONS)
  @Patch(':id/status')
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewRegistrationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (dto.status === 'approved') {
      return this.registrations.approve(id, user.userId);
    }
    return this.registrations.reject(id, user.userId, dto.rejectionReason);
  }
}
