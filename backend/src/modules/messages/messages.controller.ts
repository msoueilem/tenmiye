import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private messages: MessagesService) {}

  @ApiOperation({ summary: 'Submit a contact message — no auth required' })
  @Post()
  create(@Body() dto: CreateMessageDto) {
    return this.messages.create(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all contact messages — admin only' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.READ_ALL)
  @Get()
  findAll(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    return this.messages.findAll(limit ? parseInt(limit, 10) : 20, cursor);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a message as read — admin only' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.READ_ALL)
  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.messages.markRead(id);
  }
}
