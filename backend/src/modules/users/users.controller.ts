import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.MANAGE_USERS)
export class UsersController {
  constructor(private users: UsersService) {}

  @ApiOperation({ summary: 'Get paginated users — pass nextCursor from previous response to get next page' })
  @Get()
  findAll(@Query() query: ListUsersDto) {
    return this.users.findAll(query);
  }

  @ApiOperation({ summary: 'Get a user by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new user' })
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @ApiOperation({ summary: 'Update a user by ID' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a user by ID' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
