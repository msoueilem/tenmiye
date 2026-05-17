import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { FieldValue } from 'firebase-admin/firestore';
import { serializeDoc } from '../../common/utils/firestore';

@Injectable()
export class BoardsService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAll(): Promise<{ id: string; [key: string]: unknown }[]> {
    const snapshot = await this.firebase.db.collection('boards').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...serializeDoc(doc.data()) }));
  }

  async findOne(id: string): Promise<{ id: string; [key: string]: unknown }> {
    const doc = await this.firebase.db.collection('boards').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Board ${id} not found`);
    return { id: doc.id, ...serializeDoc(doc.data()) };
  }

  async create(dto: CreateBoardDto): Promise<{ id: string }> {
    const ref = await this.firebase.db.collection('boards').add({
      name: dto.name,
      description: dto.description ?? null,
      roleIds: dto.roleIds ?? [],
      logoUploadId: dto.logoUploadId ?? null,
      isActive: dto.isActive ?? true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async update(id: string, dto: UpdateBoardDto): Promise<void> {
    const doc = await this.firebase.db.collection('boards').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Board ${id} not found`);
    const payload = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    await this.firebase.db.collection('boards').doc(id).update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async remove(id: string): Promise<void> {
    const doc = await this.firebase.db.collection('boards').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Board ${id} not found`);
    await this.firebase.db.collection('boards').doc(id).delete();
  }
}
