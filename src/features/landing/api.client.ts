import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PublicLandingData } from '@/types/landing';

export async function getPublicLandingData(): Promise<PublicLandingData | null> {
  if (!db) {
    console.warn(
      'Firebase is not initialized. Please check your environment variables.'
    );
    return null;
  }

  try {
    const docRef = doc(db, 'settings-simple', 'public');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as PublicLandingData;
    } else {
      console.log('No such document!');
      return null;
    }
  } catch (error) {
    console.error('Error fetching public landing data:', error);
    throw error;
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