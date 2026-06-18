import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '../../common/firebase/firebase.service';
import { serializeDoc } from '../../common/utils/firestore';
import {
  CreateUploadContext,
  DeletionReason,
  UploadRecord,
  UploadResult,
} from './interfaces/upload.interface';

const COLLECTION = 'uploads';

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

@Injectable()
export class UploadsService {
  constructor(private firebase: FirebaseService) {}

  async upload(file: Express.Multer.File, ctx: CreateUploadContext): Promise<UploadResult> {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('File too large. Maximum size is 10 MB');
    }

    const ext = extensionFromFile(file.mimetype, file.originalname);
    const filename = `${ctx.purpose}-${uuidv4()}.${ext}`;
    const storagePath = `${ctx.ownerType}/${ctx.ownerId}/${filename}`;

    const bucket = this.firebase.storage.bucket();
    const fileRef = bucket.file(storagePath);
    const downloadToken = uuidv4();
    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });

    const downloadUrl = this.buildDownloadUrl(storagePath, downloadToken);
    const nowTs = Timestamp.now();

    const docRef = await this.firebase.db.collection(COLLECTION).add({
      originalName: file.originalname,
      mimeType: file.mimetype,
      extension: ext,
      sizeBytes: file.size,
      storagePath,
      downloadUrl,
      urlExpiresAt: null,
      storageDeleted: false,
      storageDeletedAt: null,
      ownerType: ctx.ownerType,
      ownerId: ctx.ownerId,
      purpose: ctx.purpose,
      status: 'active',
      validationStatus: 'passed',
      validationErrors: null,
      uploadedBy: ctx.uploadedBy,
      uploadedAt: FieldValue.serverTimestamp(),
      deleted: false,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      deletionNote: null,
      replacedBy: null,
      replacedAt: null,
      dimensions: null,
      thumbnailPath: null,
      thumbnailUrl: null,
      referenceCount: 0,
      history: [{ action: 'uploaded', by: ctx.uploadedBy, at: nowTs, note: null }],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: null,
    });

    return {
      id: docRef.id,
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
    const docRef = this.firebase.db.collection(COLLECTION).doc(uploadId);
    const doc = await docRef.get();

    if (!doc.exists) throw new NotFoundException(`Upload ${uploadId} not found`);

    const { storagePath, history = [] } = doc.data() as { storagePath: string; history: unknown[] };

    await this.firebase.storage.bucket().file(storagePath).delete({ ignoreNotFound: true });

    const nowTs = Timestamp.now();
    await docRef.update({
      deleted: true,
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy,
      deletionReason,
      deletionNote: deletionNote ?? null,
      storageDeleted: true,
      storageDeletedAt: FieldValue.serverTimestamp(),
      status: 'deleted',
      history: [...history, { action: 'deleted', by: deletedBy, at: nowTs, note: deletionNote ?? null }],
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: deletedBy,
    });
  }

  async replace(
    uploadId: string,
    file: Express.Multer.File,
    ctx: CreateUploadContext,
  ): Promise<UploadResult> {
    const oldDocRef = this.firebase.db.collection(COLLECTION).doc(uploadId);
    const oldDoc = await oldDocRef.get();

    if (!oldDoc.exists) throw new NotFoundException(`Upload ${uploadId} not found`);

    const result = await this.upload(file, ctx);

    const nowTs = Timestamp.now();
    const { storagePath: oldPath, history = [] } = oldDoc.data() as { storagePath: string; history: unknown[] };

    await oldDocRef.update({
      replacedBy: result.id,
      replacedAt: FieldValue.serverTimestamp(),
      status: 'deleted',
      deleted: true,
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: ctx.uploadedBy,
      deletionReason: 'replaced' as DeletionReason,
      history: [...history, { action: 'deleted', by: ctx.uploadedBy, at: nowTs, note: 'replaced by new upload' }],
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: ctx.uploadedBy,
    });

    await this.firebase.storage.bucket().file(oldPath).delete({ ignoreNotFound: true });

    return result;
  }

  async findById(uploadId: string): Promise<UploadRecord> {
    const docRef = this.firebase.db.collection(COLLECTION).doc(uploadId);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException(`Upload ${uploadId} not found`);

    const data = doc.data() as { storagePath: string; urlExpiresAt: Timestamp | null; deleted: boolean };

    // Migrate legacy docs that still carry an expiring signed URL to a permanent one.
    if (!data.deleted && data.urlExpiresAt) {
      const url = await this.generatePermanentUrl(data.storagePath);
      await docRef.update({
        downloadUrl: url,
        urlExpiresAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: doc.id, ...serializeDoc(doc.data()), downloadUrl: url } as UploadRecord;
    }

    return { id: doc.id, ...serializeDoc(doc.data()) } as UploadRecord;
  }

  /**
   * Builds a permanent Firebase Storage download URL backed by a download token.
   * Unlike signed URLs, these never expire (the token grants access until revoked).
   */
  private buildDownloadUrl(storagePath: string, token: string): string {
    const bucketName = this.firebase.storage.bucket().name;
    const encodedPath = encodeURIComponent(storagePath);
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
  }

  /**
   * Returns a permanent download URL for an existing object, reusing its download
   * token if present or assigning one. Used to migrate objects off legacy signed URLs.
   */
  private async generatePermanentUrl(storagePath: string): Promise<string> {
    const file = this.firebase.storage.bucket().file(storagePath);
    const [metadata] = await file.getMetadata();
    let token = metadata.metadata?.firebaseStorageDownloadTokens as string | undefined;
    if (!token) {
      token = uuidv4();
      await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
    }
    return this.buildDownloadUrl(storagePath, token);
  }

  async findAll(
    limit = 20,
    cursor?: string,
  ): Promise<{ data: UploadRecord[]; nextCursor: string | null }> {
    let query = this.firebase.db
      .collection(COLLECTION)
      .where('deleted', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (cursor) {
      const cursorDoc = await this.firebase.db.collection(COLLECTION).doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.get();
    const data = snapshot.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }) as UploadRecord);
    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;
    return { data, nextCursor };
  }
}
