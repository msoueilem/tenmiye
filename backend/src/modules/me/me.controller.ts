import {
  Controller, Get, Patch, Post, Body, UseGuards, Query,
  UseInterceptors, UploadedFile, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireUserType } from '../../common/decorators/user-type.decorator';
import { UserTypeGuard } from '../../common/guards/user-type.guard';
import { JwtPayload } from '../../common/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { UploadsService } from '../uploads/uploads.service';
import { Vote, VoteDocument } from '../elections/schemas/vote.schema';
import { Election, ElectionDocument } from '../elections/schemas/election.schema';
import { UpdateMeDto } from './dto/update-me.dto';

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), UserTypeGuard)
@RequireUserType('member')
@Controller('me')
export class MeController {
  constructor(
    private users: UsersService,
    private uploadsService: UploadsService,
    @InjectModel(Vote.name) private readonly votes: Model<VoteDocument>,
    @InjectModel(Election.name) private readonly elections: Model<ElectionDocument>,
  ) {}

  @ApiOperation({ summary: "Get the authenticated member's own profile (resolves profilePictureUrl)" })
  @Get()
  async getMe(@CurrentUser() user: JwtPayload) {
    const profile = await this.users.findOne(user.userId);
    let profilePictureUrl: string | null = null;

    if (profile.profilePictureId) {
      try {
        const file = await this.uploadsService.findById(profile.profilePictureId);
        profilePictureUrl = file.downloadUrl ?? null;
      } catch (err) {
        if (!(err instanceof NotFoundException)) throw err;
      }
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
  searchMembers(@Query('q') q: string) {
    return this.users.search(q);
  }

  @ApiOperation({ summary: "Get the authenticated member's vote history enriched with election title" })
  @Get('votes')
  async getMyVotes(@CurrentUser() user: JwtPayload) {
    const votes = await this.votes.find({ userId: user.userId }).lean();
    if (votes.length === 0) return [];

    const electionIds = [...new Set(votes.map((v) => v.electionId))].filter((id) => Types.ObjectId.isValid(id));
    const elections = await this.elections.find({ _id: { $in: electionIds } }).select('title').lean();
    const titles: Record<string, string> = {};
    for (const e of elections) titles[String(e._id)] = (e as { title?: string }).title ?? String(e._id);

    return votes
      .map((v) => ({
        id: v._id,
        electionId: v.electionId,
        electionTitle: titles[v.electionId] ?? v.electionId,
        electionType: v.electionType,
        choices: v.choices,
        castAt: v.castAt,
      }))
      .sort((a, b) => (b.castAt?.getTime() ?? 0) - (a.castAt?.getTime() ?? 0));
  }
}
