import { PublicLandingData } from '@/types/landing';
import { config } from '@/lib/config';
import { apiFetch } from '@/lib/api';

export async function getPublicLandingData(): Promise<PublicLandingData | null> {
  try {
    const res = await fetch(`${config.apiUrl}/settings/public`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json() as Promise<PublicLandingData>;
  } catch {
    return null;
  }
}

export async function updatePublicLandingData(data: Partial<PublicLandingData>): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  );
  await apiFetch('PATCH', '/settings', { body: clean, tokenType: 'admin' });
}
