import {
  Controller, Get, Patch, Post, Body, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { UpdateMeDto } from './dto/update-me.dto';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('me')
export class MeController {
  constructor(
    private users: UsersService,
    private firebase: FirebaseService,
  ) {}

  @ApiOperation({ summary: "Get the authenticated member's own profile (resolves profilePictureUrl)" })
  @Get()
  async getMe(@CurrentUser() user: JwtPayload) {
    const profile = await this.users.findOne(user.userId);
    let profilePictureUrl: string | null = null;

    if (profile.profilePictureId) {
      const fileDoc = await this.firebase.db.collection('files').doc(profile.profilePictureId).get();
      if (fileDoc.exists) profilePictureUrl = (fileDoc.data() as { url: string }).url ?? null;
    }

    return { ...profile, profilePictureUrl };
  }

  @ApiOperation({ summary: "Update the authenticated member's own profile (name, city, region, phone)" })
  @Patch()
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMeDto) {
    return this.users.update(user.userId, dto);
  }

  @ApiOperation({ summary: 'Upload profile picture — stores file, creates files doc, updates profilePictureId' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadProfilePicture(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, or WebP images are allowed');
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException('Image must be under 5 MB');
    }

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const storagePath = `profile-pictures/${uuidv4()}.${ext}`;
    const bucket = this.firebase.storage.bucket();
    const fileRef = bucket.file(storagePath);

    await fileRef.save(file.buffer, { metadata: { contentType: file.mimetype } });
    await fileRef.makePublic();

    const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Create files Firestore doc so profilePictureId reference is valid
    const docRef = await this.firebase.db.collection('files').add({
      url,
      storagePath,
      mimeType: file.mimetype,
      originalName: file.originalname,
      size: file.size,
      fileType: 'image',
      category: 'user-profile',
      uploadedBy: user.userId,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Update user's profilePictureId
    await this.users.update(user.userId, { profilePictureId: docRef.id });

    return { id: docRef.id, url };
  }

  @ApiOperation({ summary: "Get the authenticated member's vote history" })
  @Get('votes')
  async getMyVotes(@CurrentUser() user: JwtPayload) {
    const snapshot = await this.firebase.db
      .collection('votes')
      .where('userId', '==', user.userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}
