import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { FieldValue } from 'firebase-admin/firestore';

@Injectable()
export class BlogService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAll(): Promise<{ id: string; [key: string]: unknown }[]> {
    const snapshot = await this.firebase.db
      .collection('blogPosts')
      .where('status', '==', 'published')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async findOne(id: string): Promise<{ id: string; [key: string]: unknown }> {
    const doc = await this.firebase.db.collection('blogPosts').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    return { id: doc.id, ...doc.data() };
  }

  async create(dto: CreatePostDto, authorId: string): Promise<{ id: string }> {
    const ref = await this.firebase.db.collection('blogPosts').add({
      ...dto,
      status: dto.status ?? 'draft',
      authorId,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  }

  async updateContent(id: string, dto: UpdateContentDto): Promise<void> {
    const doc = await this.firebase.db.collection('blogPosts').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    await this.firebase.db.collection('blogPosts').doc(id).update({
      content: dto.content,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async updateStatus(id: string, dto: UpdateStatusDto): Promise<void> {
    const doc = await this.firebase.db.collection('blogPosts').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    await this.firebase.db.collection('blogPosts').doc(id).update({
      status: dto.status,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async remove(id: string): Promise<void> {
    const doc = await this.firebase.db.collection('blogPosts').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    await this.firebase.db.collection('blogPosts').doc(id).delete();
  }
}
