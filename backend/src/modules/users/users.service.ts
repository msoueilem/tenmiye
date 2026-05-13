import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FieldValue } from 'firebase-admin/firestore';

@Injectable()
export class UsersService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAll(): Promise<{ id: string; [key: string]: unknown }[]> {
    const snapshot = await this.firebase.db.collection('users').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async findOne(id: string): Promise<{ id: string; [key: string]: unknown }> {
    const doc = await this.firebase.db.collection('users').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return { id: doc.id, ...doc.data() };
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
      const fileDoc = await this.firebase.db.collection('files').doc(dto.profilePictureId).get();
      if (!fileDoc.exists || fileDoc.data()?.deleted === true) {
        throw new BadRequestException(`Profile picture '${dto.profilePictureId}' does not exist`);
      }
      if (fileDoc.data()?.category !== 'user-profile') {
        throw new BadRequestException(`File '${dto.profilePictureId}' is not a user profile picture`);
      }
    }

    if (dto.region) {
      const regionDoc = await this.firebase.db
        .collection('regions')
        .where('slug', '==', dto.region)
        .limit(1)
        .get();
      if (regionDoc.empty) {
        throw new BadRequestException(`Region '${dto.region}' is not a valid Mauritanian wilaya`);
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
      phoneNumber: dto.phoneNumber ?? null,
      nationalId: dto.nationalId ?? null,
      city: dto.city ?? null,
      region: dto.region ?? null,
      roleId: await this.getDefaultRoleId(),
      tierId,
      profilePictureId: dto.profilePictureId ?? null,
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      lastLoginAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async update(id: string, dto: UpdateUserDto): Promise<void> {
    const doc = await this.firebase.db.collection('users').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`User ${id} not found`);
    }
    const payload = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
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
