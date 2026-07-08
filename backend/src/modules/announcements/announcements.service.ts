import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Announcement, AnnouncementDocument } from './schemas/announcement.schema';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { serialize } from '../../common/database/serialize';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectModel(Announcement.name)
    private readonly model: Model<AnnouncementDocument>,
  ) {}

  async findActive() {
    const now = new Date();
    const docs = await this.model
      .find({
        isActive: true,
        $and: [
          { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
          { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
        ],
      })
      .lean();
    return docs.map(serialize);
  }

  async findAll() {
    const docs = await this.model.find().sort({ createdAt: -1 }).lean();
    return docs.map(serialize);
  }

  async findOne(id: string) {
    const doc = Types.ObjectId.isValid(id)
      ? await this.model.findById(id).lean()
      : null;
    if (!doc) throw new NotFoundException(`Announcement ${id} not found`);
    return serialize(doc);
  }

  async create(dto: CreateAnnouncementDto, createdBy: string) {
    const doc = await this.model.create({
      message: dto.message,
      type: dto.type,
      isActive: dto.isActive ?? true,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      ctaLabel: dto.ctaLabel ?? null,
      ctaUrl: dto.ctaUrl ?? null,
      createdBy,
    });
    return { id: doc.id };
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Announcement ${id} not found`);
    }
    const exists = await this.model.exists({ _id: id });
    if (!exists) throw new NotFoundException(`Announcement ${id} not found`);

    const payload: Record<string, unknown> = {};
    if (dto.message !== undefined) payload.message = dto.message;
    if (dto.type !== undefined) payload.type = dto.type;
    if (dto.isActive !== undefined) payload.isActive = dto.isActive;
    if (dto.ctaLabel !== undefined) payload.ctaLabel = dto.ctaLabel;
    if (dto.ctaUrl !== undefined) payload.ctaUrl = dto.ctaUrl;
    if (dto.startDate !== undefined) {
      payload.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
      payload.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    await this.model.updateOne({ _id: id }, { $set: payload });
    return { id };
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Announcement ${id} not found`);
    }
    const res = await this.model.deleteOne({ _id: id });
    if (res.deletedCount === 0) {
      throw new NotFoundException(`Announcement ${id} not found`);
    }
    return { id };
  }
}
