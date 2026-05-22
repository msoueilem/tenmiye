import {
  Controller, Post, Put, Delete, Get, Param, Query, Body,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { DeleteUploadDto } from './dto/delete-upload.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserTypeGuard } from '../../common/guards/user-type.guard';
import { RequireUserType } from '../../common/decorators/user-type.decorator';

const fileInterceptor = FileInterceptor('file', { storage: memoryStorage() });
const fileBody = {
  schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
};

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('uploads')
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @ApiOperation({ summary: 'Upload a file — returns upload ID and download URL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @Post()
  @UseInterceptors(fileInterceptor)
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('ownerType') ownerType: string,
    @Query('ownerId') ownerId: string,
    @Query('purpose') purpose: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ownerType || !ownerId || !purpose) {
      throw new BadRequestException('ownerType, ownerId, and purpose are required');
    }
    return this.uploads.upload(file, { ownerType, ownerId, purpose, uploadedBy: user.userId });
  }

  @ApiOperation({ summary: 'Replace a file — marks old as replaced, uploads new' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @Put(':id/replace')
  @UseInterceptors(fileInterceptor)
  replace(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('ownerType') ownerType: string,
    @Query('ownerId') ownerId: string,
    @Query('purpose') purpose: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.uploads.replace(id, file, { ownerType, ownerId, purpose, uploadedBy: user.userId });
  }

  @ApiOperation({ summary: 'Soft-delete an upload — removes from storage, marks deleted in Firestore' })
  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @RequireUserType('admin')
  softDelete(
    @Param('id') id: string,
    @Body() dto: DeleteUploadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.uploads.softDelete(id, user.userId, dto.deletionReason ?? 'manual', dto.deletionNote);
  }

  @ApiOperation({ summary: 'Get a single upload by ID' })
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.uploads.findById(id);
  }

  @ApiOperation({ summary: 'List all active uploads (paginated)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @Get()
  findAll(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    return this.uploads.findAll(limit ? parseInt(limit, 10) : 20, cursor);
  }
}
