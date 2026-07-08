import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdminAccount, AdminAccountDocument } from './schemas/admin-account.schema';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';
import { serialize } from '../../common/database/serialize';

@Injectable()
export class AdminAccountsService {
  constructor(
    @InjectModel(AdminAccount.name)
    private readonly model: Model<AdminAccountDocument>,
  ) {}

  async findAll() {
    const docs = await this.model.find().sort({ googleEmail: 1 }).lean();
    return docs.map(serialize);
  }

  async findOne(id: string) {
    const doc = Types.ObjectId.isValid(id) ? await this.model.findById(id).lean() : null;
    if (!doc) throw new NotFoundException(`Admin account ${id} not found`);
    return serialize(doc);
  }

  async create(dto: CreateAdminAccountDto): Promise<{ id: string }> {
    const dup = await this.model.exists({ googleEmail: dto.googleEmail });
    if (dup) throw new ConflictException(`Admin account for ${dto.googleEmail} already exists`);

    const doc = await this.model.create({
      googleEmail: dto.googleEmail,
      userId: dto.userId ?? null,
      permissions: dto.permissions,
      status: 'active',
    });
    return { id: doc.id };
  }

  async update(id: string, dto: UpdateAdminAccountDto): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Admin account ${id} not found`);
    const exists = await this.model.exists({ _id: id });
    if (!exists) throw new NotFoundException(`Admin account ${id} not found`);

    const payload = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    await this.model.updateOne({ _id: id }, { $set: payload });
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Admin account ${id} not found`);
    const res = await this.model.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException(`Admin account ${id} not found`);
  }
}
