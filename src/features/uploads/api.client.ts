import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/client';

export async function uploadImage(
  file: File,
  path: string
): Promise<string | null> {
  if (!storage || !db) return null;

  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);

    try {
      const uploadRef = doc(db, 'uploads-simple', snapshot.ref.name.replace(/\./g, '_'));
      await setDoc(uploadRef, {
        url: downloadUrl,
        path: path,
        createdAt: serverTimestamp(),
        originalName: file.name,
      });
    } catch (firestoreError) {
      console.error('Storage upload succeeded but Firestore record failed:', firestoreError);
      return downloadUrl;
    }

    return downloadUrl;
  } catch (error) {
    console.error('Full upload process failed:', error);
    return null;
  }
}