import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { FieldValue } from 'firebase-admin/firestore';
import { serializeDoc } from '../../common/utils/firestore';

@Injectable()
export class UsersService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAll(query: ListUsersDto): Promise<{ data: UserResponseDto[]; nextCursor: string | null }> {
    let ref = this.firebase.db.collection('users').orderBy('createdAt', 'desc').limit(query.limit);

    if (query.cursor) {
      const cursorDoc = await this.firebase.db.collection('users').doc(query.cursor).get();
      if (cursorDoc.exists) ref = ref.startAfter(cursorDoc);
    }

    const snapshot = await ref.get();
    const data = snapshot.docs.map((doc) =>
      plainToInstance(UserResponseDto, { id: doc.id, ...serializeDoc(doc.data()) }, { excludeExtraneousValues: true }),
    );

    const nextCursor = snapshot.docs.length === query.limit
      ? (snapshot.docs[snapshot.docs.length - 1].id)
      : null;

    return { data, nextCursor };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const doc = await this.firebase.db.collection('users').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`User ${id} not found`);
    return plainToInstance(UserResponseDto, { id: doc.id, ...serializeDoc(doc.data()) }, { excludeExtraneousValues: true });
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
      if (fileDoc.data()?.category !== 'user-profile') {
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
