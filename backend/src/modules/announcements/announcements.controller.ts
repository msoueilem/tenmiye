import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UserTypeGuard } from '../../common/guards/user-type.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequireUserType } from '../../common/decorators/user-type.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/strategies/jwt.strategy';

@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @ApiOperation({ summary: 'Get active announcements — public, respects startDate/endDate window' })
  @Get()
  findActive() {
    return this.announcements.findActive();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all announcements including inactive — admin only' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ANNOUNCEMENTS)
  @Get('all')
  findAll() {
    return this.announcements.findAll();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an announcement by ID' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ANNOUNCEMENTS)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.announcements.findOne(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new announcement' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ANNOUNCEMENTS)
  @Post()
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: JwtPayload) {
    return this.announcements.create(dto, user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an announcement' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_ANNOUNCEMENTS)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcements.update(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an announcement — admin only' })
  @UseGuards(JwtAuthGuard, UserTypeGuard, PermissionsGuard)
  @RequireUserType('admin')
  @RequirePermissions(Permission.MANAGE_ANNOUNCEMENTS)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.announcements.remove(id);
  }
}
