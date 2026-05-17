import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/strategies/jwt.strategy';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.MANAGE_ACCESS)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @ApiOperation({ summary: 'List all roles' })
  @Get()
  findAll() {
    return this.roles.findAll();
  }

  @ApiOperation({ summary: 'Get a role by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roles.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new role' })
  @Post()
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: JwtPayload) {
    return this.roles.create(dto, user.userId);
  }

  @ApiOperation({ summary: 'Update a role' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a role' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roles.remove(id);
  }
}
