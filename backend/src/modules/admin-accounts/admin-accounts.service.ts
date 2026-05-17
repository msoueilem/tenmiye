import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { serializeDoc } from '../../common/utils/firestore';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';

const COL = 'adminAccounts';

@Injectable()
export class AdminAccountsService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAll() {
    const snap = await this.firebase.db.collection(COL).orderBy('googleEmail').get();
    return snap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }));
  }

  async findOne(id: string) {
    const doc = await this.firebase.db.collection(COL).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Admin account ${id} not found`);
    return { id: doc.id, ...serializeDoc(doc.data()) };
  }

  async create(dto: CreateAdminAccountDto): Promise<{ id: string }> {
    const existing = await this.firebase.db
      .collection(COL)
      .where('googleEmail', '==', dto.googleEmail)
      .limit(1)
      .get();
    if (!existing.empty) throw new ConflictException(`Admin account for ${dto.googleEmail} already exists`);

    const ref = await this.firebase.db.collection(COL).add({
      googleEmail: dto.googleEmail,
      userId: dto.userId ?? null,
      permissions: dto.permissions,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async update(id: string, dto: UpdateAdminAccountDto): Promise<void> {
    const doc = await this.firebase.db.collection(COL).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Admin account ${id} not found`);

    const payload = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    await this.firebase.db.collection(COL).doc(id).update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async remove(id: string): Promise<void> {
    const doc = await this.firebase.db.collection(COL).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Admin account ${id} not found`);
    await this.firebase.db.collection(COL).doc(id).delete();
  }
}
