import { apiFetch, TokenType } from '@/lib/api';

interface UploadResult {
  id: string;
  downloadUrl: string;
}

interface UploadOptions {
  ownerType: string;
  ownerId: string;
  purpose: string;
  tokenType: TokenType;
}

export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResult | null> {
  const { ownerType, ownerId, purpose, tokenType } = options;
  const formData = new FormData();
  formData.append('file', file);

  const params = new URLSearchParams({ ownerType, ownerId, purpose });

  return apiFetch<UploadResult>('POST', `/uploads?${params.toString()}`, {
    formData,
    tokenType,
  });
}
