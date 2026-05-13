import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { JwtPayload } from '../../common/strategies/jwt.strategy';

@Controller('blog/posts')
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  findAll() {
    return this.blog.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blog.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.WRITE_BLOG)
  create(@Body() dto: CreatePostDto, @Req() req: { user: JwtPayload }) {
    return this.blog.create(dto, req.user.userId);
  }

  @Patch(':id/content')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.WRITE_BLOG)
  updateContent(@Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.blog.updateContent(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MODERATE_BLOG)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.blog.updateStatus(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MODERATE_BLOG)
  remove(@Param('id') id: string) {
    return this.blog.remove(id);
  }
}
