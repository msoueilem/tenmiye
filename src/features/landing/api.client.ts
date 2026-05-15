import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PublicLandingData } from '@/types/landing';

export async function getPublicLandingData(): Promise<PublicLandingData | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
  try {
    const res = await fetch(`${apiUrl}/settings/public`, { cache: 'no-store' });
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