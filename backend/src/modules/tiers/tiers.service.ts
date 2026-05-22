import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { serializeDoc } from '../../common/utils/firestore';
import { CreateTierDto } from './dto/create-tier.dto';
import { UpdateTierDto } from './dto/update-tier.dto';

const COLLECTION = 'tiers';

@Injectable()
export class TiersService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAll() {
    const snap = await this.firebase.db.collection(COLLECTION).orderBy('monthlyAmount').get();
    return snap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }));
  }

  async findOne(id: string) {
    const doc = await this.firebase.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Tier ${id} not found`);
    return { id: doc.id, ...serializeDoc(doc.data()) };
  }

  async create(dto: CreateTierDto, createdBy: string) {
    const dup = await this.firebase.db.collection(COLLECTION).where('slug', '==', dto.slug).limit(1).get();
    if (!dup.empty) throw new ConflictException(`Tier slug '${dto.slug}' already exists`);

    const ref = await this.firebase.db.collection(COLLECTION).add({
      ...dto,
      createdBy,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async update(id: string, dto: UpdateTierDto) {
    const doc = await this.firebase.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Tier ${id} not found`);

    if (dto.slug) {
      const dup = await this.firebase.db.collection(COLLECTION).where('slug', '==', dto.slug).limit(1).get();
      if (!dup.empty && dup.docs[0].id !== id) {
        throw new ConflictException(`Tier slug '${dto.slug}' already exists`);
      }
    }

    await this.firebase.db.collection(COLLECTION).doc(id).update({
      ...dto,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id };
  }

  async remove(id: string) {
    const doc = await this.firebase.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Tier ${id} not found`);
    await this.firebase.db.collection(COLLECTION).doc(id).delete();
    return { id };
  }
}
