import {
  Controller, Get, Patch, Post, Body, UseGuards, Query,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireUserType } from '../../common/decorators/user-type.decorator';
import { UserTypeGuard } from '../../common/guards/user-type.guard';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { UploadsService } from '../uploads/uploads.service';
import { UpdateMeDto } from './dto/update-me.dto';

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), UserTypeGuard)
@RequireUserType('member')
@Controller('me')
export class MeController {
  constructor(
    private users: UsersService,
    private firebase: FirebaseService,
    private uploadsService: UploadsService,
  ) {}

  @ApiOperation({ summary: "Get the authenticated member's own profile (resolves profilePictureUrl)" })
  @Get()
  async getMe(@CurrentUser() user: JwtPayload) {
    const profile = await this.users.findOne(user.userId);
    let profilePictureUrl: string | null = null;

    if (profile.profilePictureId) {
      const fileDoc = await this.firebase.db.collection('uploads').doc(profile.profilePictureId).get();
      if (fileDoc.exists) profilePictureUrl = (fileDoc.data() as { downloadUrl: string }).downloadUrl ?? null;
    }

    return { ...profile, profilePictureUrl };
  }

  @ApiOperation({ summary: "Update the authenticated member's own profile (name, city, region, phone)" })
  @Patch()
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMeDto) {
    return this.users.update(user.userId, dto);
  }

  @ApiOperation({ summary: 'Upload profile picture — stores file, creates uploads doc, updates profilePictureId' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadProfilePicture(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const result = await this.uploadsService.upload(file, {
      ownerType: 'user',
      ownerId: user.userId,
      purpose: 'profile-picture',
      uploadedBy: user.userId,
    });
    await this.users.update(user.userId, { profilePictureId: result.id });
    return { id: result.id, url: result.downloadUrl };
  }

  @ApiOperation({ summary: 'Search active members by name (AR/FR) or phone — for nomination UI' })
  @Get('members/search')
  async searchMembers(@Query('q') q: string) {
    if (!q || q.trim().length < 2) return [];
    const trimmed = q.trim();
    const end = trimmed + '￿';
    const db = this.firebase.db;

    type UserDoc = {
      fullName?: string;
      fullNameAr?: string | null;
      fullNameFr?: string | null;
      whatsappNumber?: string | null;
      phoneNumber?: string | null;
      profilePictureId?: string | null;
      status?: string;
    };

    const isNumeric = /^[\d+\s-]{2,}$/.test(trimmed);

    // Single-field range queries avoid composite index requirements.
    // Status filtering is done in JS after the fetch.
    const queries = [
      db.collection('users').where('fullName', '>=', trimmed).where('fullName', '<=', end).limit(20).get(),
      db.collection('users').where('fullNameAr', '>=', trimmed).where('fullNameAr', '<=', end).limit(20).get(),
      db.collection('users').where('fullNameFr', '>=', trimmed).where('fullNameFr', '<=', end).limit(20).get(),
      ...(isNumeric
        ? [
            db.collection('users').where('phoneNumber', '==', trimmed).limit(5).get(),
            db.collection('users').where('whatsappNumber', '==', trimmed).limit(5).get(),
          ]
        : []),
    ];

    const snapshots = await Promise.allSettled(queries);
    const seen = new Set<string>();
    type RawResult = { id: string; fullName: string; fullNameAr: string | null; fullNameFr: string | null; phoneNumber: string | null; whatsappNumber: string | null; profilePictureId: string | null };
    const raw: RawResult[] = [];

    for (const snap of snapshots) {
      if (snap.status !== 'fulfilled') continue;
      for (const doc of snap.value.docs) {
        if (seen.has(doc.id)) continue;
        seen.add(doc.id);
        const d = doc.data() as UserDoc;
        if (d.status !== 'active') continue;
        raw.push({
          id: doc.id,
          fullName: d.fullName ?? '',
          fullNameAr: d.fullNameAr ?? null,
          fullNameFr: d.fullNameFr ?? null,
          phoneNumber: d.phoneNumber ?? null,
          whatsappNumber: d.whatsappNumber ?? null,
          profilePictureId: d.profilePictureId ?? null,
        });
        if (raw.length >= 20) break;
      }
      if (raw.length >= 20) break;
    }

    // Batch-fetch profile picture URLs
    const pictureIds = raw.map((r) => r.profilePictureId).filter(Boolean) as string[];
    const urlMap: Record<string, string> = {};
    if (pictureIds.length > 0) {
      const uploadDocs = await db.getAll(...pictureIds.map((pid) => db.collection('uploads').doc(pid)));
      for (const ud of uploadDocs) {
        if (ud.exists) urlMap[ud.id] = (ud.data() as { downloadUrl?: string }).downloadUrl ?? '';
      }
    }

    return raw.map(({ profilePictureId, ...rest }) => ({
      ...rest,
      photoUrl: profilePictureId ? (urlMap[profilePictureId] ?? null) : null,
    }));
  }

  @ApiOperation({ summary: "Get the authenticated member's vote history enriched with election title" })
  @Get('votes')
  async getMyVotes(@CurrentUser() user: JwtPayload) {
    const snapshot = await this.firebase.db
      .collection('votes')
      .where('userId', '==', user.userId)
      .get();

    if (snapshot.empty) return [];

    const electionIds = [...new Set(snapshot.docs.map((d) => d.data().electionId as string))];
    const electionDocs = await Promise.all(
      electionIds.map((id) => this.firebase.db.collection('elections').doc(id).get()),
    );
    const electionTitles: Record<string, string> = {};
    for (const doc of electionDocs) {
      if (doc.exists) electionTitles[doc.id] = (doc.data() as { title?: string }).title ?? doc.id;
    }

    return snapshot.docs
      .map((d) => {
        const data = d.data() as { electionId: string; electionType: string; choices: string[]; castAt: { _seconds?: number; seconds?: number } | null };
        return {
          id: d.id,
          electionId: data.electionId,
          electionTitle: electionTitles[data.electionId] ?? data.electionId,
          electionType: data.electionType,
          choices: data.choices,
          castAt: data.castAt,
        };
      })
      .sort((a, b) => {
        const aSeconds = a.castAt?._seconds ?? a.castAt?.seconds ?? 0;
        const bSeconds = b.castAt?._seconds ?? b.castAt?.seconds ?? 0;
        return bSeconds - aSeconds;
      });
  }
}
