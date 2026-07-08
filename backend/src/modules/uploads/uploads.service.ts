import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join, resolve, sep } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppConfig } from '../../common/config/app.config';
import { serialize } from '../../common/database/serialize';
import { Upload, UploadDocument } from './schemas/upload.schema';
import {
  CreateUploadContext,
  DeletionReason,
  UploadRecord,
  UploadResult,
} from './interfaces/upload.interface';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/json',
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function extensionFromFile(mimeType: string, originalName: string): string {
  const fromName = originalName.split('.').pop();
  if (fromName) return fromName.toLowerCase();
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'application/json': 'json',
  };
  return mimeMap[mimeType] ?? 'bin';
}

/** Owner segments come from user input; keep them filesystem-safe (no separators, no `..`). */
function safeSegment(value: string): string {
  const cleaned = (value ?? '').replace(/[^A-Za-z0-9_-]/g, '_');
  return cleaned.length ? cleaned : 'unknown';
}

@Injectable()
export class UploadsService {
  private readonly dir: string;
  private readonly publicBaseUrl: string;

  constructor(
    @InjectModel(Upload.name) private readonly model: Model<UploadDocument>,
    config: ConfigService<AppConfig, true>,
  ) {
    const uploads = config.get('uploads', { infer: true });
    this.dir = resolve(uploads.dir);
    this.publicBaseUrl = uploads.publicBaseUrl;
  }

  async upload(file: Express.Multer.File, ctx: CreateUploadContext): Promise<UploadResult> {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('File too large. Maximum size is 10 MB');
    }

    const ext = extensionFromFile(file.mimetype, file.originalname);
    const filename = `${safeSegment(ctx.purpose)}-${uuidv4()}.${ext}`;
    const storagePath = `${safeSegment(ctx.ownerType)}/${safeSegment(ctx.ownerId)}/${filename}`;

    const absPath = this.toAbsolute(storagePath);
    await fs.mkdir(join(absPath, '..'), { recursive: true });
    await fs.writeFile(absPath, file.buffer);

    const downloadUrl = this.buildDownloadUrl(storagePath);
    const now = new Date();

    const doc = await this.model.create({
      originalName: file.originalname,
      mimeType: file.mimetype,
      extension: ext,
      sizeBytes: file.size,
      storagePath,
      downloadUrl,
      ownerType: ctx.ownerType,
      ownerId: ctx.ownerId,
      purpose: ctx.purpose,
      uploadedBy: ctx.uploadedBy,
      uploadedAt: now,
      history: [{ action: 'uploaded', by: ctx.uploadedBy, at: now, note: null }],
    });

    return {
      id: doc.id,
      downloadUrl,
      storagePath,
      mimeType: file.mimetype,
      originalName: file.originalname,
      sizeBytes: file.size,
    };
  }

  async softDelete(
    uploadId: string,
    deletedBy: string,
    deletionReason: DeletionReason = 'manual',
    deletionNote?: string,
  ): Promise<void> {
    const doc = await this.byId(uploadId);
    await this.deleteFromDisk(doc.storagePath);

    const now = new Date();
    await this.model.updateOne(
      { _id: doc._id },
      {
        $set: {
          deleted: true,
          deletedAt: now,
          deletedBy,
          deletionReason,
          deletionNote: deletionNote ?? null,
          storageDeleted: true,
          storageDeletedAt: now,
          status: 'deleted',
          updatedBy: deletedBy,
        },
        $push: {
          history: { action: 'deleted', by: deletedBy, at: now, note: deletionNote ?? null },
        },
      },
    );
  }

  async replace(
    uploadId: string,
    file: Express.Multer.File,
    ctx: CreateUploadContext,
  ): Promise<UploadResult> {
    const oldDoc = await this.byId(uploadId);
    const result = await this.upload(file, ctx);

    const now = new Date();
    await this.model.updateOne(
      { _id: oldDoc._id },
      {
        $set: {
          replacedBy: result.id,
          replacedAt: now,
          status: 'deleted',
          deleted: true,
          deletedAt: now,
          deletedBy: ctx.uploadedBy,
          deletionReason: 'replaced' as DeletionReason,
          updatedBy: ctx.uploadedBy,
        },
        $push: {
          history: {
            action: 'deleted',
            by: ctx.uploadedBy,
            at: now,
            note: 'replaced by new upload',
          },
        },
      },
    );

    await this.deleteFromDisk(oldDoc.storagePath);
    return result;
  }

  async findById(uploadId: string): Promise<UploadRecord> {
    const doc = await this.byId(uploadId);
    return serialize(doc) as unknown as UploadRecord;
  }

  async findAll(
    limit = 20,
    cursor?: string,
  ): Promise<{ data: UploadRecord[]; nextCursor: string | null }> {
    const filter: Record<string, unknown> = { deleted: false };
    if (cursor && Types.ObjectId.isValid(cursor)) {
      filter._id = { $lt: new Types.ObjectId(cursor) };
    }

    const docs = await this.model.find(filter).sort({ _id: -1 }).limit(limit).lean();
    const data = docs.map((d) => serialize(d) as unknown as UploadRecord);
    const nextCursor = docs.length === limit ? String(docs[docs.length - 1]._id) : null;
    return { data, nextCursor };
  }

  private async byId(uploadId: string) {
    const doc = Types.ObjectId.isValid(uploadId)
      ? await this.model.findById(uploadId).lean()
      : null;
    if (!doc) throw new NotFoundException(`Upload ${uploadId} not found`);
    return doc;
  }

  /** Resolves a storagePath under the uploads dir, guarding against traversal. */
  private toAbsolute(storagePath: string): string {
    const abs = resolve(this.dir, storagePath);
    if (abs !== this.dir && !abs.startsWith(this.dir + sep)) {
      throw new BadRequestException('Invalid storage path');
    }
    return abs;
  }

  private async deleteFromDisk(storagePath: string): Promise<void> {
    try {
      await fs.unlink(this.toAbsolute(storagePath));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  private buildDownloadUrl(storagePath: string): string {
    const encoded = storagePath.split('/').map(encodeURIComponent).join('/');
    return `${this.publicBaseUrl}/uploads/${encoded}`;
  }
}
