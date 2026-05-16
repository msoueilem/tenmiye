import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { CreatePaymentChannelDto } from './dto/create-payment-channel.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { serializeDoc } from '../../common/utils/firestore';
import { JwtPayload } from '../../common/strategies/jwt.strategy';

@Injectable()
export class FinanceService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAllPaymentChannels(): Promise<{ id: string; [key: string]: unknown }[]> {
    const snapshot = await this.firebase.db.collection('paymentChannels').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...serializeDoc(doc.data()) }));
  }

  async createPaymentChannel(dto: CreatePaymentChannelDto): Promise<{ id: string }> {
    const dupSnap = await this.firebase.db
      .collection('paymentChannels')
      .where('name', '==', dto.name)
      .limit(1)
      .get();
    if (!dupSnap.empty) {
      throw new BadRequestException(`A payment channel named '${dto.name}' already exists`);
    }

    const ref = await this.firebase.db.collection('paymentChannels').add({
      name: dto.name,
      requiresCollector: dto.requiresCollector,
      instructions: dto.instructions ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async findAllContributions(): Promise<{ id: string; [key: string]: unknown }[]> {
    const snapshot = await this.firebase.db.collection('contributions').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...serializeDoc(doc.data()) }));
  }

  async createContribution(
    dto: CreateContributionDto,
    user: JwtPayload,
  ): Promise<{ id: string }> {
    const channelDoc = await this.firebase.db
      .collection('paymentChannels')
      .doc(dto.paymentChannelId)
      .get();
    if (!channelDoc.exists) {
      throw new NotFoundException(`Payment channel ${dto.paymentChannelId} not found`);
    }

    const requiresCollector = channelDoc.data()?.requiresCollector === true;

    if (requiresCollector) {
      if (!dto.collectedByUserId) {
        throw new BadRequestException('collectedByUserId is required for this payment channel');
      }
      const collectorDoc = await this.firebase.db.collection('users').doc(dto.collectedByUserId).get();
      if (!collectorDoc.exists) {
        throw new BadRequestException(`Collector user ${dto.collectedByUserId} not found`);
      }
      if (dto.collectedByUserId !== user.userId) {
        throw new ForbiddenException('You can only record contributions you collected');
      }
    }

    if (!requiresCollector) {
      if (!dto.screenshotFileId) {
        throw new BadRequestException('screenshotFileId is required for this payment channel');
      }
      const fileDoc = await this.firebase.db.collection('uploads').doc(dto.screenshotFileId).get();
      if (!fileDoc.exists || fileDoc.data()?.deleted === true) {
        throw new BadRequestException(`File ${dto.screenshotFileId} not found`);
      }
    }

    const ref = await this.firebase.db.collection('contributions').add({
      paymentChannelId: dto.paymentChannelId,
      amount: dto.amount,
      collectedByUserId: dto.collectedByUserId ?? null,
      screenshotFileId: dto.screenshotFileId ?? null,
      notes: dto.notes ?? null,
      status: 'pending',
      recordedBy: user.userId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async verifyContribution(id: string, user: JwtPayload): Promise<void> {
    const doc = await this.firebase.db.collection('contributions').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Contribution ${id} not found`);
    }
    if (doc.data()?.status === 'verified') {
      throw new BadRequestException('Contribution is already verified');
    }
    await this.firebase.db.collection('contributions').doc(id).update({
      status: 'verified',
      verifiedBy: user.userId,
      verifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async findAllExpenses(): Promise<{ id: string; [key: string]: unknown }[]> {
    const snapshot = await this.firebase.db.collection('expenses').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...serializeDoc(doc.data()) }));
  }

  async createExpense(dto: CreateExpenseDto, user: JwtPayload): Promise<{ id: string }> {
    const ref = await this.firebase.db.collection('expenses').add({
      description: dto.description,
      amount: dto.amount,
      category: dto.category,
      date: Timestamp.fromDate(new Date(dto.date)),
      recordedBy: user.userId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }
}
