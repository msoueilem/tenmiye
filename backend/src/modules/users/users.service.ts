import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { User, UserDocument } from './schemas/user.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import { Tier, TierDocument } from '../tiers/schemas/tier.schema';
import { Upload, UploadDocument } from '../uploads/schemas/upload.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { serialize } from '../../common/database/serialize';

export interface MemberSearchResult {
  id: string;
  fullName: string;
  fullNameAr: string | null;
  fullNameFr: string | null;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  photoUrl: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(Tier.name) private readonly tierModel: Model<TierDocument>,
    @InjectModel(Upload.name) private readonly uploadModel: Model<UploadDocument>,
  ) {}

  private toResponse<T extends { _id: unknown }>(doc: T): UserResponseDto {
    return plainToInstance(UserResponseDto, serialize(doc), {
      excludeExtraneousValues: true,
    });
  }

  async findAll(query: ListUsersDto): Promise<{ data: UserResponseDto[]; nextCursor: string | null }> {
    const filter: Record<string, unknown> = {};
    if (query.cursor && Types.ObjectId.isValid(query.cursor)) {
      filter._id = { $lt: new Types.ObjectId(query.cursor) };
    }

    const docs = await this.userModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(query.limit + 1)
      .lean();

    const hasMore = docs.length > query.limit;
    const page = hasMore ? docs.slice(0, query.limit) : docs;
    const data = page.map((d) => this.toResponse(d));
    const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

    return { data, nextCursor };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const doc = Types.ObjectId.isValid(id) ? await this.userModel.findById(id).lean() : null;
    if (!doc) throw new NotFoundException(`User ${id} not found`);
    return this.toResponse(doc);
  }

  // Search active members by name (AR/FR) or phone. Membership is small, so we
  // load the active members once and match a normalized, case-insensitive
  // substring in JS (handles Arabic variants that byte-ordered queries cannot).
  async search(q: string): Promise<MemberSearchResult[]> {
    if (!q || q.trim().length < 2) return [];
    const needle = this.normalizeForSearch(q);

    type UserRow = {
      _id: unknown;
      fullName?: string;
      fullNameAr?: string | null;
      fullNameFr?: string | null;
      whatsappNumber?: string | null;
      phoneNumber?: string | null;
      profilePictureId?: string | null;
    };
    const users = (await this.userModel
      .find({ status: 'active' })
      .limit(1000)
      .lean()) as unknown as UserRow[];

    const raw: (MemberSearchResult & { profilePictureId: string | null })[] = [];
    for (const d of users) {
      const haystack = this.normalizeForSearch(
        [d.fullName, d.fullNameAr, d.fullNameFr, d.phoneNumber, d.whatsappNumber]
          .filter(Boolean)
          .join(' '),
      );
      if (!haystack.includes(needle)) continue;
      raw.push({
        id: String(d._id),
        fullName: d.fullName ?? '',
        fullNameAr: d.fullNameAr ?? null,
        fullNameFr: d.fullNameFr ?? null,
        phoneNumber: d.phoneNumber ?? null,
        whatsappNumber: d.whatsappNumber ?? null,
        photoUrl: null,
        profilePictureId: d.profilePictureId ?? null,
      });
      if (raw.length >= 20) break;
    }

    // Batch-fetch profile-picture download URLs
    const pictureIds = raw
      .map((r) => r.profilePictureId)
      .filter((id): id is string => !!id && Types.ObjectId.isValid(id));
    const urlMap: Record<string, string> = {};
    if (pictureIds.length > 0) {
      const uploads = await this.uploadModel
        .find({ _id: { $in: pictureIds } })
        .select('downloadUrl')
        .lean();
      for (const u of uploads) {
        urlMap[String(u._id)] = (u as { downloadUrl?: string }).downloadUrl ?? '';
      }
    }

    return raw.map(({ profilePictureId, ...rest }) => ({
      ...rest,
      photoUrl: profilePictureId ? (urlMap[profilePictureId] ?? null) : null,
    }));
  }

  private normalizeForSearch(s: string): string {
    return s
      .toLowerCase()
      .replace(/[ً-ْ]/g, '') // tashkeel (Arabic diacritics)
      .replace(/[أإآ]/g, 'ا') // أ إ آ → ا
      .replace(/ى/g, 'ي') // ى → ي
      .replace(/ة/g, 'ه') // ة → ه
      .replace(/\s+/g, ' ')
      .trim();
  }

  async create(dto: CreateUserDto): Promise<{ id: string }> {
    if (await this.userModel.exists({ whatsappNumber: dto.whatsappNumber })) {
      throw new BadRequestException(`A user with WhatsApp number '${dto.whatsappNumber}' already exists`);
    }
    if (await this.userModel.exists({ phoneNumber: dto.phoneNumber })) {
      throw new BadRequestException(`A user with phone number '${dto.phoneNumber}' already exists`);
    }
    if (dto.nationalId && (await this.userModel.exists({ nationalId: dto.nationalId }))) {
      throw new BadRequestException(`A user with national ID '${dto.nationalId}' already exists`);
    }

    if (dto.profilePictureId) {
      const file = Types.ObjectId.isValid(dto.profilePictureId)
        ? await this.uploadModel.findById(dto.profilePictureId).lean()
        : null;
      if (!file || (file as { deleted?: boolean }).deleted === true) {
        throw new BadRequestException(`Profile picture '${dto.profilePictureId}' does not exist`);
      }
      if ((file as { purpose?: string }).purpose !== 'profile-picture') {
        throw new BadRequestException(`File '${dto.profilePictureId}' is not a user profile picture`);
      }
    }

    let tierId: string;
    if (dto.tierId && Types.ObjectId.isValid(dto.tierId)) {
      const tier = await this.tierModel.findById(dto.tierId).select('_id').lean();
      tierId = tier ? dto.tierId : await this.getDefaultTierId();
    } else {
      tierId = await this.getDefaultTierId();
    }

    const doc = await this.userModel.create({
      fullName: dto.fullName,
      fullNameAr: dto.fullNameAr ?? null,
      fullNameFr: dto.fullNameFr ?? null,
      whatsappNumber: dto.whatsappNumber,
      phoneNumber: dto.phoneNumber,
      nationalId: dto.nationalId ?? null,
      city: dto.city ?? null,
      regionId: dto.regionId ?? null,
      joinRequestId: dto.joinRequestId ?? null,
      roleId: await this.getDefaultRoleId(),
      tierId,
      profilePictureId: dto.profilePictureId ?? null,
      outsidePlatform: dto.outsidePlatform ?? false,
      isBlocked: false,
      outsideWhatsapp: false,
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      lastLoginAt: null,
    });
    return { id: doc.id };
  }

  async update(
    id: string,
    dto: UpdateUserDto | { phoneNumber?: string; [key: string]: unknown },
  ): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`User ${id} not found`);
    const exists = await this.userModel.exists({ _id: id });
    if (!exists) throw new NotFoundException(`User ${id} not found`);

    if (dto.phoneNumber) {
      const dup = await this.userModel.findOne({ phoneNumber: dto.phoneNumber }).select('_id').lean();
      if (dup && String(dup._id) !== id) {
        throw new BadRequestException(`Phone number '${dto.phoneNumber}' is already in use`);
      }
    }

    const payload = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    await this.userModel.updateOne({ _id: id }, { $set: payload });
  }

  private async getDefaultRoleId(): Promise<string> {
    const role = await this.roleModel.findOne({ slug: 'member' }).select('_id').lean();
    if (!role) throw new Error('Default role (member) not found in roles collection');
    return String(role._id);
  }

  private async getDefaultTierId(): Promise<string> {
    const tier = await this.tierModel.findOne({ slug: 'basic' }).select('_id').lean();
    if (!tier) throw new Error('Default tier (basic) not found in tiers collection');
    return String(tier._id);
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`User ${id} not found`);
    const res = await this.userModel.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException(`User ${id} not found`);
  }
}
