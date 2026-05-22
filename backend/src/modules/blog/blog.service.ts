import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { FieldValue } from 'firebase-admin/firestore';
import { serializeDoc } from '../../common/utils/firestore';

const COLLECTION = 'blogs';

@Injectable()
export class BlogService {
  constructor(private readonly firebase: FirebaseService) {}

  private async resolveFeatureImageUrl(featureImageId: string | null | undefined): Promise<string | null> {
    if (!featureImageId) return null;
    const fileDoc = await this.firebase.db.collection('uploads').doc(featureImageId).get();
    if (!fileDoc.exists) return null;
    return (fileDoc.data() as { downloadUrl?: string }).downloadUrl ?? null;
  }

  async findAll(publishedOnly = true): Promise<{ id: string; [key: string]: unknown }[]> {
    const col = this.firebase.db.collection(COLLECTION);
    const query = publishedOnly ? col.where('status', '==', 'published') : col;
    const snapshot = await query.get();

    const posts = snapshot.docs.map((doc) => ({ id: doc.id, ...serializeDoc(doc.data()) } as Record<string, unknown> & { id: string }));
    const imageIds = [...new Set(posts.map((p) => p['featureImageId'] as string | null | undefined).filter(Boolean))] as string[];
    const imageMap: Record<string, string | null> = {};
    await Promise.all(imageIds.map(async (imgId) => {
      imageMap[imgId] = await this.resolveFeatureImageUrl(imgId);
    }));

    return posts.map((p) => ({
      ...p,
      featureImageUrl: imageMap[p['featureImageId'] as string] ?? null,
    }));
  }

  async findOne(id: string, publishedOnly = true): Promise<{ id: string; [key: string]: unknown }> {
    const doc = await this.firebase.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Post ${id} not found`);
    if (publishedOnly && doc.data()?.status !== 'published') throw new NotFoundException(`Post ${id} not found`);
    const data = { id: doc.id, ...serializeDoc(doc.data()) } as Record<string, unknown> & { id: string };
    return {
      ...data,
      featureImageUrl: await this.resolveFeatureImageUrl(data['featureImageId'] as string | null),
    };
  }

  async create(dto: CreatePostDto, authorId: string): Promise<{ id: string }> {
    const dupSlug = await this.firebase.db.collection(COLLECTION).where('slug', '==', dto.slug).limit(1).get();
    if (!dupSlug.empty) throw new ConflictException(`Slug '${dto.slug}' is already in use`);

    if (dto.featureImageId) {
      const fileDoc = await this.firebase.db.collection('uploads').doc(dto.featureImageId).get();
      if (!fileDoc.exists || fileDoc.data()?.deleted === true) {
        throw new BadRequestException(`File ${dto.featureImageId} not found`);
      }
      if (fileDoc.data()?.category !== 'blog-feature-image') {
        throw new BadRequestException(`File ${dto.featureImageId} is not a blog feature image`);
      }
    }

    const ref = await this.firebase.db.collection(COLLECTION).add({
      title: dto.title,
      slug: dto.slug,
      content: dto.content,
      tags: dto.tags ?? [],
      featureImageId: dto.featureImageId ?? null,
      status: 'draft',
      publishedAt: null,
      authorId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async update(id: string, dto: UpdatePostDto): Promise<void> {
    const doc = await this.firebase.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Post ${id} not found`);

    if (dto.slug) {
      const dup = await this.firebase.db.collection(COLLECTION).where('slug', '==', dto.slug).limit(1).get();
      if (!dup.empty && dup.docs[0].id !== id) throw new ConflictException(`Slug '${dto.slug}' is already in use`);
    }

    if (dto.featureImageId) {
      const fileDoc = await this.firebase.db.collection('uploads').doc(dto.featureImageId).get();
      if (!fileDoc.exists || fileDoc.data()?.deleted === true) {
        throw new BadRequestException(`File ${dto.featureImageId} not found`);
      }
      if (fileDoc.data()?.category !== 'blog-feature-image') {
        throw new BadRequestException(`File ${dto.featureImageId} is not a blog feature image`);
      }
    }

    const payload = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    await this.firebase.db.collection(COLLECTION).doc(id).update({
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async updateStatus(id: string, dto: UpdateStatusDto): Promise<{ id: string; [key: string]: unknown }> {
    const doc = await this.firebase.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Post ${id} not found`);

    const update: Record<string, unknown> = {
      status: dto.status,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (dto.status === 'published' && !doc.data()?.publishedAt) {
      update.publishedAt = FieldValue.serverTimestamp();
    }

    await this.firebase.db.collection(COLLECTION).doc(id).update(update);
    return this.findOne(id, false);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.firebase.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Post ${id} not found`);
    await this.firebase.db.collection(COLLECTION).doc(id).delete();
  }
}
