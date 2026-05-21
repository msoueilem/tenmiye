import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
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
      .limit(query.limit + 1) as FirebaseFirestore.Query;

    if (query.type) ref = ref.where('type', '==', query.type);
    if (query.year) ref = ref.where('year', '==', query.year);
    if (query.month) ref = ref.where('month', '==', query.month);
    if (query.userId) ref = ref.where('userId', '==', query.userId);

    if (query.cursor) {
      const cursorDoc = await this.firebase.db.collection('transactions').doc(query.cursor).get();
      if (cursorDoc.exists) ref = ref.startAfter(cursorDoc);
    }

    const snap = await ref.get();
    const hasMore = snap.docs.length > query.limit;
    const docs = hasMore ? snap.docs.slice(0, query.limit) : snap.docs;

    const data = docs
      .map((d) => ({ id: d.id, ...serializeDoc(d.data()) }))
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aTs = a.date as { _seconds?: number; seconds?: number } | null;
        const bTs = b.date as { _seconds?: number; seconds?: number } | null;
        const aS = aTs?._seconds ?? aTs?.seconds ?? 0;
        const bS = bTs?._seconds ?? bTs?.seconds ?? 0;
        return bS - aS;
      });

    const nextCursor = hasMore ? docs[docs.length - 1].id : null;
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

  async disableTransaction(id: string, disabledBy: string): Promise<{ id: string }> {
    const doc = await this.firebase.db.collection('transactions').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Transaction ${id} not found`);
    if (doc.data()?.isActive === false) throw new BadRequestException('Transaction is already disabled');

    await doc.ref.update({
      isActive: false,
      disabledBy,
      disabledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id };
  }

  // ─── Summary ──────────────────────────────────────────────────────────────

  async getSummary(year: number, month?: number) {
    const snap = await this.firebase.db
      .collection('transactions')
      .where('year', '==', year)
      .get();

    const totals: Record<string, number> = { contribution: 0, donation: 0, expense: 0 };

    for (const doc of snap.docs) {
      const d = doc.data() as { type: string; amount: number; month: number };
      if (month && d.month !== month) continue;
      if (d.type in totals) {
        totals[d.type] = (totals[d.type] ?? 0) + (d.amount ?? 0);
      }
    }

    const income = totals.contribution + totals.donation;
    const net = income - totals.expense;

    return { year, month: month ?? null, totals, income, net, currency: 'MRU' };
  }
}
