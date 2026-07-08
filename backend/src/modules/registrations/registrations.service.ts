import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JoinRequest, JoinRequestDocument } from './schemas/join-request.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import { Tier, TierDocument } from '../tiers/schemas/tier.schema';
import { serialize } from '../../common/database/serialize';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectModel(JoinRequest.name) private readonly model: Model<JoinRequestDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roles: Model<RoleDocument>,
    @InjectModel(Tier.name) private readonly tiers: Model<TierDocument>,
  ) {}

  async create(dto: CreateRegistrationDto): Promise<{ id: string }> {
    const doc = await this.model.create({
      fullName: dto.fullName,
      phone: dto.phone,
      tierId: dto.tierId ?? null,
      city: dto.city ?? null,
      message: dto.message ?? null,
      status: 'pending',
    });
    return { id: doc.id };
  }

  async findAll(
    limit = 20,
    cursor?: string,
  ): Promise<{ data: Record<string, unknown>[]; nextCursor: string | null }> {
    const filter: Record<string, unknown> = {};
    if (cursor && Types.ObjectId.isValid(cursor)) filter._id = { $lt: new Types.ObjectId(cursor) };
    const docs = await this.model.find(filter).sort({ _id: -1 }).limit(limit).lean();
    const data = docs.map(serialize);
    const nextCursor = docs.length === limit ? String(docs[docs.length - 1]._id) : null;
    return { data, nextCursor };
  }

  async approve(id: string, reviewedBy: string): Promise<{ userId: string }> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Join request ${id} not found`);
    const jr = await this.model.findById(id);
    if (!jr) throw new NotFoundException(`Join request ${id} not found`);
    if (jr.status !== 'pending') {
      throw new BadRequestException(`Join request is already ${jr.status}`);
    }

    const role = await this.roles.findOne({ slug: 'member' }).select('_id').lean();
    if (!role) {
      throw new InternalServerErrorException('Default member role not found — seed the roles collection first');
    }
    const roleId = String(role._id);

    let tierId = jr.tierId ?? null;
    if (!tierId) {
      const tier = await this.tiers.findOne({ slug: 'basic' }).select('_id').lean();
      if (tier) tierId = String(tier._id);
    }

    // Idempotent: reuse an existing member with the same phone, else create one.
    let user = await this.users.findOne({ phoneNumber: jr.phone });
    if (!user) {
      user = await this.users.create({
        fullName: jr.fullName,
        phoneNumber: jr.phone,
        whatsappNumber: jr.phone,
        city: jr.city ?? null,
        regionId: null,
        roleId,
        tierId,
        joinRequestId: id,
        profilePictureId: null,
        outsidePlatform: false,
        isBlocked: false,
        outsideWhatsapp: false,
        status: 'active',
        approvedBy: reviewedBy,
        approvedAt: new Date(),
        lastLoginAt: null,
      });
    } else {
      await this.users.updateOne(
        { _id: user._id },
        { $set: { status: 'active', approvedBy: reviewedBy, approvedAt: new Date(), joinRequestId: id } },
      );
    }

    await this.model.updateOne(
      { _id: id },
      { $set: { status: 'approved', createdUserId: String(user._id), reviewedBy, reviewedAt: new Date() } },
    );

    return { userId: String(user._id) };
  }

  async reject(id: string, reviewedBy: string, rejectionReason?: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Join request ${id} not found`);
    const jr = await this.model.findById(id).lean();
    if (!jr) throw new NotFoundException(`Join request ${id} not found`);
    if (jr.status !== 'pending') {
      throw new BadRequestException(`Join request is already ${jr.status}`);
    }

    await this.model.updateOne(
      { _id: id },
      { $set: { status: 'rejected', rejectionReason: rejectionReason ?? null, reviewedBy, reviewedAt: new Date() } },
    );
  }
}
