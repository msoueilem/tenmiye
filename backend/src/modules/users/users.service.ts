import { Injectable, NotFoundException } from '@nestjs/common';
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
    const ref = await this.firebase.db.collection('users').add({
      ...dto,
      createdAt: FieldValue.serverTimestamp(),
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

  async remove(id: string): Promise<void> {
    const doc = await this.firebase.db.collection('users').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`User ${id} not found`);
    }
    await this.firebase.db.collection('users').doc(id).delete();
  }
}
