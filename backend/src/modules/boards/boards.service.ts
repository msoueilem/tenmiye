import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { FieldValue } from 'firebase-admin/firestore';

@Injectable()
export class BoardsService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAll(): Promise<{ id: string; [key: string]: unknown }[]> {
    const snapshot = await this.firebase.db.collection('boards').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async findOne(id: string): Promise<{ id: string; [key: string]: unknown }> {
    const doc = await this.firebase.db.collection('boards').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Board ${id} not found`);
    }
    return { id: doc.id, ...doc.data() };
  }

  async create(dto: CreateBoardDto): Promise<{ id: string }> {
    const ref = await this.firebase.db.collection('boards').add({
      ...dto,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async update(id: string, dto: Partial<CreateBoardDto>): Promise<void> {
    const doc = await this.firebase.db.collection('boards').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Board ${id} not found`);
    }
    const payload = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    await this.firebase.db.collection('boards').doc(id).update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async remove(id: string): Promise<void> {
    const doc = await this.firebase.db.collection('boards').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Board ${id} not found`);
    }
    await this.firebase.db.collection('boards').doc(id).delete();
  }

  async createRole(boardId: string, dto: CreateRoleDto): Promise<{ id: string }> {
    const boardDoc = await this.firebase.db.collection('boards').doc(boardId).get();
    if (!boardDoc.exists) {
      throw new NotFoundException(`Board ${boardId} not found`);
    }
    const { boardId: _dtoBoardId, ...roleData } = dto;
    const ref = await this.firebase.db.collection('roles').add({
      ...roleData,
      boardId,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }
}
