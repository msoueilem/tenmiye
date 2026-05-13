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
import { FieldValue } from 'firebase-admin/firestore';
import { JwtPayload } from '../../common/strategies/jwt.strategy';

@Injectable()
export class FinanceService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAllPaymentChannels(): Promise<{ id: string; [key: string]: unknown }[]> {
    const snapshot = await this.firebase.db.collection('paymentChannels').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createPaymentChannel(dto: CreatePaymentChannelDto): Promise<{ id: string }> {
    const ref = await this.firebase.db.collection('paymentChannels').add({
      ...dto,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async findAllContributions(): Promise<{ id: string; [key: string]: unknown }[]> {
    const snapshot = await this.firebase.db.collection('contributions').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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

    const channel = channelDoc.data() as { requiresCollector: boolean };

    if (channel.requiresCollector && dto.collectedByUserId !== user.userId) {
      throw new ForbiddenException('You can only record contributions you collected');
    }

    if (!channel.requiresCollector && !dto.screenshotUrl) {
      throw new BadRequestException('screenshotUrl is required for this payment channel');
    }

    const ref = await this.firebase.db.collection('contributions').add({
      ...dto,
      status: 'pending',
      recordedBy: user.userId,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { id: ref.id };
  }

  async verifyContribution(id: string): Promise<void> {
    const doc = await this.firebase.db.collection('contributions').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Contribution ${id} not found`);
    }
    await this.firebase.db.collection('contributions').doc(id).update({
      status: 'verified',
      verifiedAt: FieldValue.serverTimestamp(),
    });
  }

  async findAllExpenses(): Promise<{ id: string; [key: string]: unknown }[]> {
    const snapshot = await this.firebase.db.collection('expenses').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createExpense(dto: CreateExpenseDto, user: JwtPayload): Promise<{ id: string }> {
    const ref = await this.firebase.db.collection('expenses').add({
      ...dto,
      recordedBy: user.userId,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }
}
