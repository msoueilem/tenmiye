import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

class UpdateStatusDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';
}

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
  @ApiOperation({ summary: 'Approve or reject a join request — admin only' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_REGISTRATIONS)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.registrations.updateStatus(id, dto.status);
  }
}
