import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { serialize } from '../../common/database/serialize';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private readonly model: Model<RoleDocument>,
  ) {}

  async findAll() {
    const docs = await this.model.find().sort({ createdAt: 1 }).lean();
    return docs.map(serialize);
  }

  async findOne(id: string) {
    const doc = Types.ObjectId.isValid(id)
      ? await this.model.findById(id).lean()
      : null;
    if (!doc) throw new NotFoundException(`Role ${id} not found`);
    return serialize(doc);
  }

  async create(dto: CreateRoleDto, createdBy: string) {
    const dup = await this.model.exists({ slug: dto.slug });
    if (dup) throw new ConflictException(`Role slug '${dto.slug}' already exists`);

    const doc = await this.model.create({
      ...dto,
      responsibilities: dto.responsibilities ?? [],
      isActive: dto.isActive ?? true,
      createdBy,
    });
    return { id: doc.id };
  }

  async update(id: string, dto: UpdateRoleDto) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Role ${id} not found`);
    const exists = await this.model.exists({ _id: id });
    if (!exists) throw new NotFoundException(`Role ${id} not found`);

    if (dto.slug) {
      const dup = await this.model.findOne({ slug: dto.slug }).select('_id').lean();
      if (dup && String(dup._id) !== id) {
        throw new ConflictException(`Role slug '${dto.slug}' already exists`);
      }
    }

    await this.model.updateOne({ _id: id }, { $set: { ...dto } });
    return { id };
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Role ${id} not found`);
    const res = await this.model.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException(`Role ${id} not found`);
    return { id };
  }
}
