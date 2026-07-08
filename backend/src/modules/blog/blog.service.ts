import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BlogPost, BlogPostDocument } from './schemas/blog-post.schema';
import { Upload, UploadDocument } from '../uploads/schemas/upload.schema';
import { serialize } from '../../common/database/serialize';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(BlogPost.name) private readonly model: Model<BlogPostDocument>,
    @InjectModel(Upload.name) private readonly uploads: Model<UploadDocument>,
  ) {}

  private async resolveFeatureImageUrl(featureImageId: string | null | undefined): Promise<string | null> {
    if (!featureImageId || !Types.ObjectId.isValid(featureImageId)) return null;
    const file = await this.uploads.findById(featureImageId).select('downloadUrl').lean();
    return (file as { downloadUrl?: string })?.downloadUrl ?? null;
  }

  private async assertFeatureImage(featureImageId?: string | null): Promise<void> {
    if (!featureImageId) return;
    const file = Types.ObjectId.isValid(featureImageId)
      ? await this.uploads.findById(featureImageId).lean()
      : null;
    if (!file || (file as { deleted?: boolean }).deleted === true) {
      throw new BadRequestException(`File ${featureImageId} not found`);
    }
    if ((file as { purpose?: string }).purpose !== 'blog-feature-image') {
      throw new BadRequestException(`File ${featureImageId} is not a blog feature image`);
    }
  }

  async findAll(publishedOnly = true) {
    const filter = publishedOnly ? { status: 'published' } : {};
    const docs = await this.model.find(filter).lean();
    const posts = docs.map(serialize);

    const imageIds = [...new Set(posts.map((p) => p.featureImageId).filter(Boolean))] as string[];
    const imageMap: Record<string, string | null> = {};
    await Promise.all(imageIds.map(async (id) => (imageMap[id] = await this.resolveFeatureImageUrl(id))));

    return posts.map((p) => ({
      ...p,
      featureImageUrl: p.featureImageId ? (imageMap[p.featureImageId as string] ?? null) : null,
    }));
  }

  async findOne(id: string, publishedOnly = true) {
    const doc = Types.ObjectId.isValid(id) ? await this.model.findById(id).lean() : null;
    if (!doc) throw new NotFoundException(`Post ${id} not found`);
    if (publishedOnly && doc.status !== 'published') throw new NotFoundException(`Post ${id} not found`);
    const data = serialize(doc);
    return { ...data, featureImageUrl: await this.resolveFeatureImageUrl(data.featureImageId as string | null) };
  }

  async create(dto: CreatePostDto, authorId: string): Promise<{ id: string }> {
    if (await this.model.exists({ slug: dto.slug })) {
      throw new ConflictException(`Slug '${dto.slug}' is already in use`);
    }
    await this.assertFeatureImage(dto.featureImageId);

    const doc = await this.model.create({
      title: dto.title,
      slug: dto.slug,
      content: dto.content,
      tags: dto.tags ?? [],
      featureImageId: dto.featureImageId ?? null,
      status: 'draft',
      publishedAt: null,
      authorId,
    });
    return { id: doc.id };
  }

  async update(id: string, dto: UpdatePostDto): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Post ${id} not found`);
    const exists = await this.model.exists({ _id: id });
    if (!exists) throw new NotFoundException(`Post ${id} not found`);

    if (dto.slug) {
      const dup = await this.model.findOne({ slug: dto.slug }).select('_id').lean();
      if (dup && String(dup._id) !== id) throw new ConflictException(`Slug '${dto.slug}' is already in use`);
    }
    await this.assertFeatureImage(dto.featureImageId);

    const payload = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    await this.model.updateOne({ _id: id }, { $set: payload });
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Post ${id} not found`);
    const doc = await this.model.findById(id).lean();
    if (!doc) throw new NotFoundException(`Post ${id} not found`);

    const update: Record<string, unknown> = { status: dto.status };
    if (dto.status === 'published' && !doc.publishedAt) update.publishedAt = new Date();

    await this.model.updateOne({ _id: id }, { $set: update });
    return this.findOne(id, false);
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Post ${id} not found`);
    const res = await this.model.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException(`Post ${id} not found`);
  }
}
