import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PublicLandingData } from '@/types/landing';
import { config } from '@/lib/config';

export async function getPublicLandingData(): Promise<PublicLandingData | null> {
  try {
    const res = await fetch(`${config.apiUrl}/settings/public`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json() as Promise<PublicLandingData>;
  } catch {
    return null;
  }
}

export async function updatePublicLandingData(
  data: Partial<PublicLandingData>
): Promise<void> {
  if (!db) return;
  const docRef = doc(db, 'settings-simple', 'public');
  
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  
  await updateDoc(docRef, cleanData);
}