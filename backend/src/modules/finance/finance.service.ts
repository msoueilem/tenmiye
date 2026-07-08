import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentChannel, PaymentChannelDocument } from './schemas/payment-channel.schema';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { Upload, UploadDocument } from '../uploads/schemas/upload.schema';
import { serialize } from '../../common/database/serialize';
import { CreatePaymentChannelDto } from './dto/create-payment-channel.dto';
import { UpdatePaymentChannelDto } from './dto/update-payment-channel.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';

@Injectable()
export class FinanceService {
  constructor(
    @InjectModel(PaymentChannel.name) private readonly channels: Model<PaymentChannelDocument>,
    @InjectModel(Transaction.name) private readonly transactions: Model<TransactionDocument>,
    @InjectModel(Upload.name) private readonly uploads: Model<UploadDocument>,
  ) {}

  // ─── Payment Channels ──────────────────────────────────────────────────────

  async findAllPaymentChannels() {
    const docs = await this.channels.find().sort({ name: 1 }).lean();
    return docs.map(serialize);
  }

  async createPaymentChannel(dto: CreatePaymentChannelDto): Promise<{ id: string }> {
    if (await this.channels.exists({ name: dto.name })) {
      throw new BadRequestException(`Payment channel '${dto.name}' already exists`);
    }
    if (dto.type === 'mobile' && (!dto.walletNumber || !dto.walletOwner)) {
      throw new BadRequestException('walletNumber and walletOwner are required for mobile channels');
    }

    const doc = await this.channels.create({
      name: dto.name,
      type: dto.type,
      walletNumber: dto.walletNumber ?? null,
      walletOwner: dto.walletOwner ?? null,
      requiresScreenshot: dto.type === 'mobile',
      requiresReceiver: dto.type === 'cash',
      isActive: dto.isActive ?? true,
    });
    return { id: doc.id };
  }

  async updatePaymentChannel(id: string, dto: UpdatePaymentChannelDto): Promise<{ id: string }> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Payment channel ${id} not found`);
    const exists = await this.channels.exists({ _id: id });
    if (!exists) throw new NotFoundException(`Payment channel ${id} not found`);

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

    await this.channels.updateOne({ _id: id }, { $set: payload });
    return { id };
  }

  async removePaymentChannel(id: string): Promise<{ id: string }> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Payment channel ${id} not found`);
    const res = await this.channels.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException(`Payment channel ${id} not found`);
    return { id };
  }

  // ─── Transactions ────────────────────────────────────────────────────────

  async findAllTransactions(query: ListTransactionsDto) {
    const filter: Record<string, unknown> = {};
    if (query.type) filter.type = query.type;
    if (query.year) filter.year = query.year;
    if (query.month) filter.month = query.month;
    if (query.userId) filter.userId = query.userId;
    if (query.cursor && Types.ObjectId.isValid(query.cursor)) {
      filter._id = { $lt: new Types.ObjectId(query.cursor) };
    }

    const docs = await this.transactions
      .find(filter)
      .sort({ date: -1, _id: -1 })
      .limit(query.limit + 1)
      .lean();

    const hasMore = docs.length > query.limit;
    const page = hasMore ? docs.slice(0, query.limit) : docs;
    const data = page.map(serialize);
    const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;
    return { data, nextCursor };
  }

  async createTransaction(dto: CreateTransactionDto, recordedBy: string): Promise<{ id: string }> {
    const channel = Types.ObjectId.isValid(dto.paymentChannelId)
      ? await this.channels.findById(dto.paymentChannelId).lean()
      : null;
    if (!channel) throw new NotFoundException(`Payment channel ${dto.paymentChannelId} not found`);
    if (!channel.isActive) throw new BadRequestException('This payment channel is inactive');

    if (channel.requiresScreenshot) {
      if (!dto.screenshotUploadId) {
        throw new BadRequestException('screenshotUploadId is required for mobile payments');
      }
      const upload = Types.ObjectId.isValid(dto.screenshotUploadId)
        ? await this.uploads.findById(dto.screenshotUploadId).lean()
        : null;
      if (!upload || (upload as { deleted?: boolean }).deleted === true) {
        throw new BadRequestException(`Upload ${dto.screenshotUploadId} not found`);
      }
    }

    if (dto.type === 'contribution' && !dto.userId) {
      throw new BadRequestException('userId is required for contributions');
    }

    const date = new Date(dto.date);
    const doc = await this.transactions.create({
      type: dto.type,
      amount: dto.amount,
      date,
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
    });
    return { id: doc.id };
  }

  async verifyTransaction(id: string, verifiedBy: string): Promise<{ id: string }> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Transaction ${id} not found`);
    const doc = await this.transactions.findById(id).lean();
    if (!doc) throw new NotFoundException(`Transaction ${id} not found`);
    if (doc.verifiedBy) throw new BadRequestException('Transaction is already verified');

    await this.transactions.updateOne({ _id: id }, { $set: { verifiedBy, verifiedAt: new Date() } });
    return { id };
  }

  async disableTransaction(id: string, disabledBy: string): Promise<{ id: string }> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Transaction ${id} not found`);
    const doc = await this.transactions.findById(id).lean();
    if (!doc) throw new NotFoundException(`Transaction ${id} not found`);
    if (doc.isActive === false) throw new BadRequestException('Transaction is already disabled');

    await this.transactions.updateOne(
      { _id: id },
      { $set: { isActive: false, disabledBy, disabledAt: new Date() } },
    );
    return { id };
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  async getSummary(year: number, month?: number) {
    const filter: Record<string, unknown> = { year };
    if (month) filter.month = month;
    const docs = await this.transactions.find(filter).lean();

    const totals: Record<string, number> = { contribution: 0, donation: 0, expense: 0 };
    for (const d of docs) {
      if (d.type in totals) totals[d.type] += d.amount ?? 0;
    }
    const income = totals.contribution + totals.donation;
    const net = income - totals.expense;
    return { year, month: month ?? null, totals, income, net, currency: 'MRU' };
  }
}
