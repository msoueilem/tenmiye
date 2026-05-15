import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

const fileInterceptor = FileInterceptor('file', { storage: memoryStorage() });
const fileBody = {
  schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
};

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('files')
export class FilesController {
  constructor(private files: FilesService) {}

  @ApiOperation({ summary: 'Upload file to storage — returns URL + storagePath. Caller saves metadata.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @Post('upload')
  @UseInterceptors(fileInterceptor)
  upload(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('No file provided');
    return this.files.upload(file);
  }

  @ApiOperation({ summary: 'Replace a file — deletes old from storage, uploads new, updates metadata document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @Put(':id/replace')
  @UseInterceptors(fileInterceptor)
  replace(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('No file provided');
    return this.files.replaceById(id, file);
  }

  @ApiOperation({ summary: 'Delete a file from storage and its metadata document' })
  @Delete(':id')
  deleteFile(@Param('id') id: string) {
    return this.files.deleteById(id);
  }

  @ApiOperation({ summary: 'List all files from the files collection (paginated)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @Get()
  findAll(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    return this.files.findAll(limit ? parseInt(limit, 10) : 20, cursor);
  }

  @ApiOperation({ summary: 'List raw files in Firebase Storage — use to audit orphaned uploads' })
  @ApiQuery({ name: 'pageToken', required: false, type: String })
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.READ_ALL)
  @Get('storage')
  listStorage(@Query('pageToken') pageToken?: string) {
    return this.files.listStorage(pageToken);
  }
}
