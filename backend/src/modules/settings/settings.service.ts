import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const COLLECTION = 'settings-simple';
const DOC_ID = 'public';

@Injectable()
export class SettingsService {
  constructor(private firebase: FirebaseService) {}

  async getPublic(): Promise<Record<string, unknown>> {
    const snap = await this.firebase.db.collection(COLLECTION).doc(DOC_ID).get();
    if (!snap.exists) throw new NotFoundException('Settings document not found');
    return snap.data() as Record<string, unknown>;
  }

  async update(dto: UpdateSettingsDto): Promise<Record<string, unknown>> {
    const docRef = this.firebase.db.collection(COLLECTION).doc(DOC_ID);
    const snap = await docRef.get();
    if (!snap.exists) throw new NotFoundException('Settings document not found');

    const clean = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    await docRef.update({ ...clean, updatedAt: FieldValue.serverTimestamp() });

    const updated = await docRef.get();
    return updated.data() as Record<string, unknown>;
  }
}
