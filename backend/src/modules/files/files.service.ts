import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { serializeDoc } from '../../common/utils/firestore';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '../../common/firebase/firebase.service';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type FileType = 'image' | 'pdf';

export interface UploadResult {
  url: string;
  storagePath: string;
  mimeType: string;
  originalName: string;
  size: number;
  fileType: FileType;
}

export interface FileRecord {
  id: string;
  url: string;
  storagePath: string;
  mimeType: string;
  originalName: string;
  size: number;
  fileType: FileType;
  uploadedBy: string;
  createdAt: unknown;
  [key: string]: unknown;
}

export interface StorageFileEntry {
  storagePath: string;
  size: string;
  contentType: string;
  updated: string;
}

@Injectable()
export class FilesService {
  constructor(private firebase: FirebaseService) {}

  // ─── Upload ──────────────────────────────────────────────────────────────────

  async upload(file: Express.Multer.File): Promise<UploadResult> {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, GIF, PDF`,
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('File too large. Maximum size is 10 MB');
    }

    const ext = file.originalname.split('.').pop() ?? '';
    const storagePath = `uploads/${uuidv4()}.${ext}`;
    const bucket = this.firebase.storage.bucket();
    const fileRef = bucket.file(storagePath);

    await fileRef.save(file.buffer, { metadata: { contentType: file.mimetype } });
    await fileRef.makePublic();

    const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    const fileType: FileType = file.mimetype === 'application/pdf' ? 'pdf' : 'image';

    return { url, storagePath, mimeType: file.mimetype, originalName: file.originalname, size: file.size, fileType };
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async deleteById(fileId: string): Promise<{ message: string }> {
    const docRef = this.firebase.db.collection('files').doc(fileId);
    const doc = await docRef.get();

    if (!doc.exists) throw new NotFoundException(`File ${fileId} not found`);

    const { storagePath } = doc.data() as { storagePath: string };

    await this.firebase.storage.bucket().file(storagePath).delete({ ignoreNotFound: true });
    await docRef.delete();

    return { message: 'File deleted' };
  }

  // ─── Replace (update) ────────────────────────────────────────────────────────

  async replaceById(fileId: string, file: Express.Multer.File): Promise<UploadResult> {
    const docRef = this.firebase.db.collection('files').doc(fileId);
    const doc = await docRef.get();

    if (!doc.exists) throw new NotFoundException(`File ${fileId} not found`);

    const { storagePath: oldPath } = doc.data() as { storagePath: string };

    // Upload new file first — if it fails, old file is still intact
    const result = await this.upload(file);

    // Delete old file from storage (best-effort)
    await this.firebase.storage.bucket().file(oldPath).delete({ ignoreNotFound: true });

    // Update only the file-related fields in the document; preserve caller metadata
    await docRef.update({
      url: result.url,
      storagePath: result.storagePath,
      mimeType: result.mimeType,
      originalName: result.originalName,
      size: result.size,
      fileType: result.fileType,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return result;
  }

  // ─── List from Firestore ─────────────────────────────────────────────────────

  async findAll(limit = 20, cursor?: string): Promise<{ data: FileRecord[]; nextCursor: string | null }> {
    let query = this.firebase.db
      .collection('files')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (cursor) {
      const cursorDoc = await this.firebase.db.collection('files').doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.get();
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...serializeDoc(doc.data()) }) as FileRecord);
    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;

    return { data, nextCursor };
  }

  // ─── List raw Storage files (orphan audit) ───────────────────────────────────

  async listStorage(pageToken?: string): Promise<{ files: StorageFileEntry[]; nextPageToken: string | null }> {
    const bucket = this.firebase.storage.bucket();
    const [storageFiles, , meta] = await bucket.getFiles({
      prefix: 'uploads/',
      maxResults: 50,
      pageToken,
    });

    const files: StorageFileEntry[] = storageFiles.map((f) => ({
      storagePath: f.name,
      size: f.metadata.size as string,
      contentType: f.metadata.contentType as string,
      updated: f.metadata.updated as string,
    }));

    const nextPageToken = (meta as Record<string, unknown> | undefined)?.['pageToken'] as string | undefined;
    return { files, nextPageToken: nextPageToken ?? null };
  }
}
