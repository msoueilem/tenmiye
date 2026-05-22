import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { serializeDoc } from '../../common/utils/firestore';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

const COLLECTION = 'announcements';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly firebase: FirebaseService) {}

  async findActive() {
    const now = Timestamp.now();
    const snap = await this.firebase.db
      .collection(COLLECTION)
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs
      .map((d) => ({ id: d.id, ...serializeDoc(d.data()) } as Record<string, unknown> & { id: string }))
      .filter((a) => {
        const start = a['startDate'] as Timestamp | null;
        const end = a['endDate'] as Timestamp | null;
        if (start && start.toMillis() > now.toMillis()) return false;
        if (end && end.toMillis() < now.toMillis()) return false;
        return true;
      });
  }

  async findAll() {
    const snap = await this.firebase.db
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }));
  }

  async findOne(id: string) {
    const doc = await this.firebase.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Announcement ${id} not found`);
    return { id: doc.id, ...serializeDoc(doc.data()) };
  }

  async create(dto: CreateAnnouncementDto, createdBy: string) {
    const ref = await this.firebase.db.collection(COLLECTION).add({
      message: dto.message,
      type: dto.type,
      isActive: dto.isActive ?? true,
      startDate: dto.startDate ? Timestamp.fromDate(new Date(dto.startDate)) : null,
      endDate: dto.endDate ? Timestamp.fromDate(new Date(dto.endDate)) : null,
      ctaLabel: dto.ctaLabel ?? null,
      ctaUrl: dto.ctaUrl ?? null,
      createdBy,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    const doc = await this.firebase.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Announcement ${id} not found`);

    const payload: Record<string, unknown> = {};
    if (dto.message !== undefined) payload.message = dto.message;
    if (dto.type !== undefined) payload.type = dto.type;
    if (dto.isActive !== undefined) payload.isActive = dto.isActive;
    if (dto.ctaLabel !== undefined) payload.ctaLabel = dto.ctaLabel;
    if (dto.ctaUrl !== undefined) payload.ctaUrl = dto.ctaUrl;
    if (dto.startDate !== undefined) payload.startDate = dto.startDate ? Timestamp.fromDate(new Date(dto.startDate)) : null;
    if (dto.endDate !== undefined) payload.endDate = dto.endDate ? Timestamp.fromDate(new Date(dto.endDate)) : null;

    await this.firebase.db.collection(COLLECTION).doc(id).update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id };
  }

  async remove(id: string) {
    const doc = await this.firebase.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Announcement ${id} not found`);
    await this.firebase.db.collection(COLLECTION).doc(id).delete();
    return { id };
  }
}
