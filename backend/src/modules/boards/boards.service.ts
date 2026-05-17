import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { serializeDoc } from '../../common/utils/firestore';

@Injectable()
export class BoardsService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAll(): Promise<{ id: string; [key: string]: unknown }[]> {
    const snapshot = await this.firebase.db
      .collection('boards')
      .orderBy('termStartDate', 'desc')
      .get();
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
      termStartDate: Timestamp.fromDate(new Date(dto.termStartDate)),
      termEndDate: Timestamp.fromDate(new Date(dto.termEndDate)),
      status: dto.status ?? 'upcoming',
      mandates: dto.mandates ?? [],
      obligations: dto.obligations ?? [],
      achievements: dto.achievements ?? [],
      electionId: dto.electionId ?? null,
      predecessorBoardId: dto.predecessorBoardId ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async update(id: string, dto: UpdateBoardDto): Promise<{ id: string }> {
    const doc = await this.firebase.db.collection('boards').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Board ${id} not found`);

    const payload: Record<string, unknown> = {};

    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.description !== undefined) payload.description = dto.description;
    if (dto.roleIds !== undefined) payload.roleIds = dto.roleIds;
    if (dto.logoUploadId !== undefined) payload.logoUploadId = dto.logoUploadId;
    if (dto.status !== undefined) payload.status = dto.status;
    if (dto.mandates !== undefined) payload.mandates = dto.mandates;
    if (dto.obligations !== undefined) payload.obligations = dto.obligations;
    if (dto.achievements !== undefined) payload.achievements = dto.achievements;
    if (dto.electionId !== undefined) payload.electionId = dto.electionId;
    if (dto.predecessorBoardId !== undefined) payload.predecessorBoardId = dto.predecessorBoardId;
    if (dto.termStartDate !== undefined) payload.termStartDate = Timestamp.fromDate(new Date(dto.termStartDate));
    if (dto.termEndDate !== undefined) payload.termEndDate = Timestamp.fromDate(new Date(dto.termEndDate));

    await this.firebase.db.collection('boards').doc(id).update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id };
  }

  async remove(id: string): Promise<void> {
    const doc = await this.firebase.db.collection('boards').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Board ${id} not found`);
    await this.firebase.db.collection('boards').doc(id).delete();
  }
}
