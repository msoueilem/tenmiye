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
import { UpdatePostDto } from './dto/update-post.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UserTypeGuard } from '../../common/guards/user-type.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequireUserType } from '../../common/decorators/user-type.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('blog')
@ApiBearerAuth()
@Controller('blog/posts')
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @ApiOperation({ summary: 'Get published blog posts — no auth required' })
  @Get()
  findAll() {
    return this.blog.findAll();
  }

  @ApiOperation({ summary: 'Get all blog posts including drafts — writers and moderators only' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.WRITE_BLOG)
  @Get('all')
  findAllAdmin() {
    return this.blog.findAll(false);
  }

  @ApiOperation({ summary: 'Get a blog post by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blog.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new blog post' })
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.WRITE_BLOG)
  create(@Body() dto: CreatePostDto, @Req() req: { user: JwtPayload }) {
    return this.blog.create(dto, req.user.userId);
  }

  @ApiOperation({ summary: 'Update a blog post by ID' })
  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.WRITE_BLOG)
  update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.blog.update(id, dto);
  }

  @ApiOperation({ summary: 'Update blog post status by ID' })
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MODERATE_BLOG)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.blog.updateStatus(id, dto);
  }

  @ApiOperation({ summary: 'Delete a blog post by ID — admin only' })
  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserTypeGuard, PermissionsGuard)
  @RequireUserType('admin')
  @RequirePermissions(Permission.MODERATE_BLOG)
  remove(@Param('id') id: string) {
    return this.blog.remove(id);
  }
}
