export type UploadStatus = 'pending' | 'active' | 'deleted' | 'orphaned';
export type ValidationStatus = 'pending' | 'passed' | 'failed';
export type DeletionReason = 'parent-deleted' | 'manual' | 'replaced' | 'rejected';
export type HistoryAction = 'uploaded' | 'validated' | 'linked' | 'unlinked' | 'deleted' | 'restored';

export interface UploadHistoryEntry {
  action: HistoryAction;
  by: string;
  at: string;
  note: string | null;
}

export interface UploadRecord {
  id: string;
  originalName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  storagePath: string;
  downloadUrl: string | null;
  urlExpiresAt: string | null;
  storageDeleted: boolean;
  storageDeletedAt: string | null;
  ownerType: string;
  ownerId: string;
  purpose: string;
  status: UploadStatus;
  validationStatus: ValidationStatus;
  validationErrors: string[] | null;
  uploadedBy: string;
  uploadedAt: string;
  deleted: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
  deletionReason: DeletionReason | null;
  deletionNote: string | null;
  replacedBy: string | null;
  replacedAt: string | null;
  dimensions: { width: number; height: number } | null;
  thumbnailPath: string | null;
  thumbnailUrl: string | null;
  referenceCount: number;
  history: UploadHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface CreateUploadContext {
  ownerType: string;
  ownerId: string;
  purpose: string;
  uploadedBy: string;
}

export interface UploadResult {
  id: string;
  downloadUrl: string;
  storagePath: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
}
