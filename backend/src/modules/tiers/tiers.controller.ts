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
@ApiBearerAuth()
@Controller('tiers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.MANAGE_SETTINGS)
export class TiersController {
  constructor(private readonly tiers: TiersService) {}

  @ApiOperation({ summary: 'List all tiers ordered by monthly amount' })
  @Get()
  findAll() {
    return this.tiers.findAll();
  }

  @ApiOperation({ summary: 'Get a tier by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tiers.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new tier' })
  @Post()
  create(@Body() dto: CreateTierDto, @CurrentUser() user: JwtPayload) {
    return this.tiers.create(dto, user.userId);
  }

  @ApiOperation({ summary: 'Update a tier' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTierDto) {
    return this.tiers.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a tier — admin only' })
  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserTypeGuard, PermissionsGuard)
  @RequireUserType('admin')
  remove(@Param('id') id: string) {
    return this.tiers.remove(id);
  }
}
