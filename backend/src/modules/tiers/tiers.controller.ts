import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TiersService } from './tiers.service';
import { CreateTierDto } from './dto/create-tier.dto';
import { UpdateTierDto } from './dto/update-tier.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UserTypeGuard } from '../../common/guards/user-type.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequireUserType } from '../../common/decorators/user-type.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/strategies/jwt.strategy';

@ApiTags('tiers')
@Controller('tiers')
export class TiersController {
  constructor(private readonly tiers: TiersService) {}

  @ApiOperation({ summary: 'List all tiers — public, used by registration form' })
  @Get()
  findAll() {
    return this.tiers.findAll();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a tier by ID' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_TIERS)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tiers.findOne(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new tier' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_TIERS)
  @Post()
  create(@Body() dto: CreateTierDto, @CurrentUser() user: JwtPayload) {
    return this.tiers.create(dto, user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a tier' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_TIERS)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTierDto) {
    return this.tiers.update(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a tier — admin only' })
  @UseGuards(JwtAuthGuard, UserTypeGuard, PermissionsGuard)
  @RequireUserType('admin')
  @RequirePermissions(Permission.MANAGE_TIERS)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tiers.remove(id);
  }
}
