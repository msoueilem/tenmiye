import { Injectable } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { serializeDoc } from '../../common/utils/firestore';

const COLLECTION = 'join-requests';

@Injectable()
export class RegistrationsService {
  constructor(private firebase: FirebaseService) {}

  async create(dto: CreateRegistrationDto): Promise<{ id: string }> {
    const ref = await this.firebase.db.collection(COLLECTION).add({
      ...dto,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async findAll(
    limit = 20,
    cursor?: string,
  ): Promise<{ data: Record<string, unknown>[]; nextCursor: string | null }> {
    let query = this.firebase.db
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (cursor) {
      const cursorDoc = await this.firebase.db.collection(COLLECTION).doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.get();
    const data = snapshot.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }));
    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;
    return { data, nextCursor };
  }

  async updateStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    await this.firebase.db.collection(COLLECTION).doc(id).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
