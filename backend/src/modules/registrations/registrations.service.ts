import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { serializeDoc } from '../../common/utils/firestore';

const COLLECTION = 'join-requests';
const COUNTRY_CODE = '+222';

type JoinRequestData = {
  fullName: string;
  phone: string;
  tierId?: string;
  city?: string;
  status: string;
};

@Injectable()
export class RegistrationsService {
  constructor(private firebase: FirebaseService) {}

  async create(dto: CreateRegistrationDto): Promise<{ id: string }> {
    const ref = await this.firebase.db.collection(COLLECTION).add({
      fullName: dto.fullName,
      phone: dto.phone,
      tierId: dto.tierId ?? null,
      city: dto.city ?? null,
      message: dto.message ?? null,
      status: 'pending',
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      createdUserId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
    const nextCursor =
      snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;
    return { data, nextCursor };
  }

  async approve(id: string, reviewedBy: string): Promise<{ userId: string }> {
    const doc = await this.firebase.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Join request ${id} not found`);

    const data = doc.data() as JoinRequestData;
    if (data.status !== 'pending') {
      throw new BadRequestException(`Join request is already ${data.status}`);
    }

    // Resolve member roleId
    const roleSnap = await this.firebase.db
      .collection('roles')
      .where('slug', '==', 'member')
      .limit(1)
      .get();
    if (roleSnap.empty) {
      throw new InternalServerErrorException('Default member role not found — seed the roles collection first');
    }
    const roleId = roleSnap.docs[0].id;

    // Resolve tierId — use request's choice or fall back to basic tier
    let tierId = data.tierId ?? null;
    if (!tierId) {
      const tierSnap = await this.firebase.db
        .collection('tiers')
        .where('slug', '==', 'basic')
        .limit(1)
        .get();
      if (!tierSnap.empty) tierId = tierSnap.docs[0].id;
    }

    // Create Firebase Auth account
    const e164 = `${COUNTRY_CODE}${data.phone}`;
    let authUid: string;
    try {
      const authUser = await this.firebase.auth.createUser({ phoneNumber: e164 });
      authUid = authUser.uid;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/phone-number-already-exists') {
        // Phone already in Auth — fetch existing UID
        const existing = await this.firebase.auth.getUserByPhoneNumber(e164);
        authUid = existing.uid;
      } else {
        throw new InternalServerErrorException(`Firebase Auth error: ${String(err)}`);
      }
    }

    // Create users document (idempotent — set with merge)
    await this.firebase.db.collection('users').doc(authUid).set(
      {
        fullName: data.fullName,
        phoneNumber: data.phone,
        whatsappNumber: data.phone,
        city: data.city ?? null,
        regionId: null,
        roleId,
        tierId,
        joinRequestId: id,
        profilePictureId: null,
        outsidePlatform: false,
        status: 'active',
        approvedBy: reviewedBy,
        approvedAt: FieldValue.serverTimestamp(),
        lastLoginAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Mark join request approved
    await doc.ref.update({
      status: 'approved',
      createdUserId: authUid,
      reviewedBy,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { userId: authUid };
  }

  async reject(id: string, reviewedBy: string, rejectionReason?: string): Promise<void> {
    const doc = await this.firebase.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Join request ${id} not found`);

    const data = doc.data() as JoinRequestData;
    if (data.status !== 'pending') {
      throw new BadRequestException(`Join request is already ${data.status}`);
    }

    await doc.ref.update({
      status: 'rejected',
      rejectionReason: rejectionReason ?? null,
      reviewedBy,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
