import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAccountsService } from './admin-accounts.service';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UserTypeGuard } from '../../common/guards/user-type.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequireUserType } from '../../common/decorators/user-type.decorator';
import { Permission } from '../../common/enums/permission.enum';

@ApiTags('admin-accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserTypeGuard, PermissionsGuard)
@RequireUserType('admin')
@RequirePermissions(Permission.MANAGE_ACCESS)
@Controller('admin-accounts')
export class AdminAccountsController {
  constructor(private readonly service: AdminAccountsService) {}

  @ApiOperation({ summary: 'List all admin accounts' })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Get a single admin account by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Create an admin account' })
  @Post()
  create(@Body() dto: CreateAdminAccountDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Update permissions or status of an admin account' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminAccountDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete an admin account' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
