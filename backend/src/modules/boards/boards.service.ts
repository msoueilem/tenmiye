import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { instanceToPlain } from 'class-transformer';
import { Board, BoardDocument } from './schemas/board.schema';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { serialize } from '../../common/database/serialize';

@Injectable()
export class BoardsService {
  constructor(
    @InjectModel(Board.name) private readonly model: Model<BoardDocument>,
  ) {}

  async findAll() {
    const docs = await this.model.find().sort({ termStartDate: -1 }).lean();
    return docs.map(serialize);
  }

  async findOne(id: string) {
    const doc = Types.ObjectId.isValid(id) ? await this.model.findById(id).lean() : null;
    if (!doc) throw new NotFoundException(`Board ${id} not found`);
    return serialize(doc);
  }

  async create(dto: CreateBoardDto): Promise<{ id: string }> {
    const doc = await this.model.create({
      name: dto.name,
      description: dto.description ?? null,
      roleIds: dto.roleIds ?? [],
      logoUploadId: dto.logoUploadId ?? null,
      termStartDate: new Date(dto.termStartDate),
      termEndDate: new Date(dto.termEndDate),
      status: dto.status ?? 'upcoming',
      mandates: dto.mandates ?? [],
      obligations: dto.obligations ?? [],
      achievements: instanceToPlain(dto.achievements ?? []),
      electionId: dto.electionId ?? null,
      predecessorBoardId: dto.predecessorBoardId ?? null,
    });
    return { id: doc.id };
  }

  async update(id: string, dto: UpdateBoardDto): Promise<{ id: string }> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Board ${id} not found`);
    const exists = await this.model.exists({ _id: id });
    if (!exists) throw new NotFoundException(`Board ${id} not found`);

    const payload: Record<string, unknown> = {};
    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.description !== undefined) payload.description = dto.description;
    if (dto.roleIds !== undefined) payload.roleIds = dto.roleIds;
    if (dto.logoUploadId !== undefined) payload.logoUploadId = dto.logoUploadId;
    if (dto.status !== undefined) payload.status = dto.status;
    if (dto.mandates !== undefined) payload.mandates = dto.mandates;
    if (dto.obligations !== undefined) payload.obligations = dto.obligations;
    if (dto.achievements !== undefined) payload.achievements = instanceToPlain(dto.achievements);
    if (dto.electionId !== undefined) payload.electionId = dto.electionId;
    if (dto.predecessorBoardId !== undefined) payload.predecessorBoardId = dto.predecessorBoardId;
    if (dto.termStartDate !== undefined) payload.termStartDate = new Date(dto.termStartDate);
    if (dto.termEndDate !== undefined) payload.termEndDate = new Date(dto.termEndDate);

    await this.model.updateOne({ _id: id }, { $set: payload });
    return { id };
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Board ${id} not found`);
    const res = await this.model.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException(`Board ${id} not found`);
  }
}
