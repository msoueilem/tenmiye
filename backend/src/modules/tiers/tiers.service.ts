import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tier, TierDocument } from './schemas/tier.schema';
import { CreateTierDto } from './dto/create-tier.dto';
import { UpdateTierDto } from './dto/update-tier.dto';
import { serialize } from '../../common/database/serialize';

@Injectable()
export class TiersService {
  constructor(
    @InjectModel(Tier.name) private readonly model: Model<TierDocument>,
  ) {}

  async findAll() {
    const docs = await this.model.find().sort({ monthlyAmount: 1 }).lean();
    return docs.map(serialize);
  }

  async findOne(id: string) {
    const doc = Types.ObjectId.isValid(id)
      ? await this.model.findById(id).lean()
      : null;
    if (!doc) throw new NotFoundException(`Tier ${id} not found`);
    return serialize(doc);
  }

  async create(dto: CreateTierDto, createdBy: string) {
    const dup = await this.model.exists({ slug: dto.slug });
    if (dup) throw new ConflictException(`Tier slug '${dto.slug}' already exists`);

    const doc = await this.model.create({
      ...dto,
      isActive: dto.isActive ?? true,
      createdBy,
    });
    return { id: doc.id };
  }

  async update(id: string, dto: UpdateTierDto) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Tier ${id} not found`);
    const exists = await this.model.exists({ _id: id });
    if (!exists) throw new NotFoundException(`Tier ${id} not found`);

    if (dto.slug) {
      const dup = await this.model.findOne({ slug: dto.slug }).select('_id').lean();
      if (dup && String(dup._id) !== id) {
        throw new ConflictException(`Tier slug '${dto.slug}' already exists`);
      }
    }

    await this.model.updateOne({ _id: id }, { $set: { ...dto } });
    return { id };
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Tier ${id} not found`);
    const res = await this.model.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException(`Tier ${id} not found`);
    return { id };
  }
}
