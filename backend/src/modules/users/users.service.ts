import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { FieldValue } from 'firebase-admin/firestore';
import { serializeDoc } from '../../common/utils/firestore';

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
  constructor(private readonly firebase: FirebaseService) {}

  async findAll(query: ListUsersDto): Promise<{ data: UserResponseDto[]; nextCursor: string | null }> {
    let ref = this.firebase.db.collection('users').orderBy('createdAt', 'desc').limit(query.limit + 1);

    if (query.cursor) {
      const cursorDoc = await this.firebase.db.collection('users').doc(query.cursor).get();
      if (cursorDoc.exists) ref = ref.startAfter(cursorDoc);
    }

    const snapshot = await ref.get();
    const hasMore = snapshot.docs.length > query.limit;
    const docs = hasMore ? snapshot.docs.slice(0, query.limit) : snapshot.docs;
    const data = docs.map((doc) =>
      plainToInstance(UserResponseDto, { id: doc.id, ...serializeDoc(doc.data()) }, { excludeExtraneousValues: true }),
    );

    const nextCursor = hasMore ? docs[docs.length - 1].id : null;

    return { data, nextCursor };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const doc = await this.firebase.db.collection('users').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`User ${id} not found`);
    return plainToInstance(UserResponseDto, { id: doc.id, ...serializeDoc(doc.data()) }, { excludeExtraneousValues: true });
  }

  // Search active members by name (AR/FR) or phone. Single-field range queries
  // avoid composite indexes; status filtering and dedup happen in JS.
  async search(q: string): Promise<MemberSearchResult[]> {
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
    type RawResult = {
      id: string;
      fullName: string;
      fullNameAr: string | null;
      fullNameFr: string | null;
      phoneNumber: string | null;
      whatsappNumber: string | null;
      profilePictureId: string | null;
    };
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

  async create(dto: CreateUserDto): Promise<{ id: string }> {
    const existing = await this.firebase.db
      .collection('users')
      .where('whatsappNumber', '==', dto.whatsappNumber)
      .limit(1)
      .get();
    if (!existing.empty) {
      throw new BadRequestException(`A user with WhatsApp number '${dto.whatsappNumber}' already exists`);
    }

    const dupPhone = await this.firebase.db
      .collection('users')
      .where('phoneNumber', '==', dto.phoneNumber)
      .limit(1)
      .get();
    if (!dupPhone.empty) {
      throw new BadRequestException(`A user with phone number '${dto.phoneNumber}' already exists`);
    }

    if (dto.nationalId) {
      const dupId = await this.firebase.db
        .collection('users')
        .where('nationalId', '==', dto.nationalId)
        .limit(1)
        .get();
      if (!dupId.empty) {
        throw new BadRequestException(`A user with national ID '${dto.nationalId}' already exists`);
      }
    }

    if (dto.profilePictureId) {
      const fileDoc = await this.firebase.db.collection('uploads').doc(dto.profilePictureId).get();
      if (!fileDoc.exists || fileDoc.data()?.deleted === true) {
        throw new BadRequestException(`Profile picture '${dto.profilePictureId}' does not exist`);
      }
      if (fileDoc.data()?.purpose !== 'profile-picture') {
        throw new BadRequestException(`File '${dto.profilePictureId}' is not a user profile picture`);
      }
    }

    let tierId: string;
    if (dto.tierId) {
      const tierDoc = await this.firebase.db.collection('tiers').doc(dto.tierId).get();
      tierId = tierDoc.exists ? dto.tierId : await this.getDefaultTierId();
    } else {
      tierId = await this.getDefaultTierId();
    }

    const ref = await this.firebase.db.collection('users').add({
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async update(id: string, dto: UpdateUserDto | { phoneNumber?: string; [key: string]: unknown }): Promise<void> {
    const doc = await this.firebase.db.collection('users').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`User ${id} not found`);

    if (dto.phoneNumber) {
      const dup = await this.firebase.db
        .collection('users')
        .where('phoneNumber', '==', dto.phoneNumber)
        .limit(1)
        .get();
      if (!dup.empty && dup.docs[0].id !== id) {
        throw new BadRequestException(`Phone number '${dto.phoneNumber}' is already in use`);
      }
    }

    const payload = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    await this.firebase.db.collection('users').doc(id).update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  private async getDefaultRoleId(): Promise<string> {
    const snap = await this.firebase.db
      .collection('roles')
      .where('slug', '==', 'member')
      .limit(1)
      .get();
    if (snap.empty) throw new Error('Default role (member) not found in roles collection');
    return snap.docs[0].id;
  }

  private async getDefaultTierId(): Promise<string> {
    const snap = await this.firebase.db
      .collection('tiers')
      .where('slug', '==', 'basic')
      .limit(1)
      .get();
    if (snap.empty) throw new Error('Default tier (basic) not found in tiers collection');
    return snap.docs[0].id;
  }

  async remove(id: string): Promise<void> {
    const doc = await this.firebase.db.collection('users').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`User ${id} not found`);
    }
    await this.firebase.db.collection('users').doc(id).delete();
  }
}
