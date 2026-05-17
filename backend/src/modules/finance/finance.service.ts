import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AggregateField, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { serializeDoc } from '../../common/utils/firestore';
import { CreatePaymentChannelDto } from './dto/create-payment-channel.dto';
import { UpdatePaymentChannelDto } from './dto/update-payment-channel.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';

type ChannelData = {
  type: 'mobile' | 'cash';
  requiresScreenshot: boolean;
  requiresReceiver: boolean;
  isActive: boolean;
};

// ─── Payment Channels ────────────────────────────────────────────────────────

@Injectable()
export class FinanceService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAllPaymentChannels() {
    const snap = await this.firebase.db.collection('paymentChannels').orderBy('name').get();
    return snap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }));
  }

  async createPaymentChannel(dto: CreatePaymentChannelDto): Promise<{ id: string }> {
    const dup = await this.firebase.db.collection('paymentChannels').where('name', '==', dto.name).limit(1).get();
    if (!dup.empty) throw new BadRequestException(`Payment channel '${dto.name}' already exists`);

    if (dto.type === 'mobile' && (!dto.walletNumber || !dto.walletOwner)) {
      throw new BadRequestException('walletNumber and walletOwner are required for mobile channels');
    }

    const ref = await this.firebase.db.collection('paymentChannels').add({
      name: dto.name,
      type: dto.type,
      walletNumber: dto.walletNumber ?? null,
      walletOwner: dto.walletOwner ?? null,
      requiresScreenshot: dto.type === 'mobile',
      requiresReceiver: dto.type === 'cash',
      isActive: dto.isActive ?? true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async updatePaymentChannel(id: string, dto: UpdatePaymentChannelDto): Promise<{ id: string }> {
    const doc = await this.firebase.db.collection('paymentChannels').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Payment channel ${id} not found`);

    const payload: Record<string, unknown> = {};
    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.walletNumber !== undefined) payload.walletNumber = dto.walletNumber;
    if (dto.walletOwner !== undefined) payload.walletOwner = dto.walletOwner;
    if (dto.isActive !== undefined) payload.isActive = dto.isActive;
    if (dto.type !== undefined) {
      payload.type = dto.type;
      payload.requiresScreenshot = dto.type === 'mobile';
      payload.requiresReceiver = dto.type === 'cash';
    }

    await this.firebase.db.collection('paymentChannels').doc(id).update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id };
  }

  async removePaymentChannel(id: string): Promise<{ id: string }> {
    const doc = await this.firebase.db.collection('paymentChannels').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Payment channel ${id} not found`);
    await this.firebase.db.collection('paymentChannels').doc(id).delete();
    return { id };
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  async findAllTransactions(query: ListTransactionsDto) {
    let ref = this.firebase.db
      .collection('transactions')
      .orderBy('date', 'desc')
      .limit(query.limit) as FirebaseFirestore.Query;

    if (query.type) ref = ref.where('type', '==', query.type);
    if (query.year) ref = ref.where('year', '==', query.year);
    if (query.month) ref = ref.where('month', '==', query.month);
    if (query.userId) ref = ref.where('userId', '==', query.userId);

    if (query.cursor) {
      const cursorDoc = await this.firebase.db.collection('transactions').doc(query.cursor).get();
      if (cursorDoc.exists) ref = ref.startAfter(cursorDoc);
    }

    const snap = await ref.get();
    const data = snap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }));
    const nextCursor = snap.docs.length === query.limit ? snap.docs[snap.docs.length - 1].id : null;
    return { data, nextCursor };
  }

  async createTransaction(dto: CreateTransactionDto, recordedBy: string): Promise<{ id: string }> {
    const channelDoc = await this.firebase.db.collection('paymentChannels').doc(dto.paymentChannelId).get();
    if (!channelDoc.exists) throw new NotFoundException(`Payment channel ${dto.paymentChannelId} not found`);

    const channel = channelDoc.data() as ChannelData;
    if (!channel.isActive) throw new BadRequestException('This payment channel is inactive');

    if (channel.requiresScreenshot) {
      if (!dto.screenshotUploadId) throw new BadRequestException('screenshotUploadId is required for mobile payments');
      const uploadDoc = await this.firebase.db.collection('uploads').doc(dto.screenshotUploadId).get();
      if (!uploadDoc.exists || uploadDoc.data()?.deleted === true) {
        throw new BadRequestException(`Upload ${dto.screenshotUploadId} not found`);
      }
    }

    if (dto.type === 'contribution' && !dto.userId) {
      throw new BadRequestException('userId is required for contributions');
    }

    const date = new Date(dto.date);
    const ref = await this.firebase.db.collection('transactions').add({
      type: dto.type,
      amount: dto.amount,
      date: Timestamp.fromDate(date),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      paymentChannelId: dto.paymentChannelId,
      receivedBy: channel.requiresReceiver ? recordedBy : null,
      receivedByNote: dto.receivedByNote ?? null,
      screenshotUploadId: dto.screenshotUploadId ?? null,
      userId: dto.userId ?? null,
      period: dto.period ?? null,
      paidTo: dto.paidTo ?? null,
      purpose: dto.purpose ?? null,
      receiptUploadId: dto.receiptUploadId ?? null,
      notes: dto.notes ?? null,
      recordedBy,
      verifiedBy: null,
      verifiedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async verifyTransaction(id: string, verifiedBy: string): Promise<{ id: string }> {
    const doc = await this.firebase.db.collection('transactions').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Transaction ${id} not found`);
    if (doc.data()?.verifiedBy) throw new BadRequestException('Transaction is already verified');

    await doc.ref.update({
      verifiedBy,
      verifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id };
  }

  // ─── Summary ──────────────────────────────────────────────────────────────

  async getSummary(year: number, month?: number) {
    const types = ['contribution', 'donation', 'expense'] as const;
    const totals: Record<string, number> = {};

    await Promise.all(
      types.map(async (type) => {
        let q = this.firebase.db
          .collection('transactions')
          .where('year', '==', year)
          .where('type', '==', type) as FirebaseFirestore.Query;
        if (month) q = q.where('month', '==', month);

        const result = await q.aggregate({ total: AggregateField.sum('amount') }).get();
        totals[type] = result.data().total;
      }),
    );

    const income = totals.contribution + totals.donation;
    const net = income - totals.expense;

    return { year, month: month ?? null, totals, income, net };
  }
}
