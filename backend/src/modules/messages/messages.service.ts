import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { serialize } from '../../common/database/serialize';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private readonly model: Model<MessageDocument>,
  ) {}

  async create(dto: CreateMessageDto): Promise<{ id: string }> {
    const doc = await this.model.create({ ...dto, read: false });
    return { id: doc.id };
  }

  async findAll(
    limit = 20,
    cursor?: string,
  ): Promise<{ data: Record<string, unknown>[]; nextCursor: string | null }> {
    // Newest first. `_id` is monotonic with insertion time, so it doubles as a
    // stable, unique pagination cursor (no ties, unlike a createdAt sort).
    const filter: Record<string, unknown> = {};
    if (cursor && Types.ObjectId.isValid(cursor)) {
      filter._id = { $lt: new Types.ObjectId(cursor) };
    }

    const docs = await this.model.find(filter).sort({ _id: -1 }).limit(limit).lean();
    const data = docs.map(serialize);
    const nextCursor =
      docs.length === limit ? String(docs[docs.length - 1]._id) : null;
    return { data, nextCursor };
  }

  async markRead(id: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { read: true, readAt: new Date() });
  }
}
