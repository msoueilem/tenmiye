import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, deleteDoc, orderBy, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Election, Vote } from '@/types/elections';

export async function getAllElections(): Promise<Election[]> {
  if (!db) return [];
  try {
    const electionsRef = collection(db, 'elections-simple');
    const q = query(electionsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Election));
  } catch (error) {
    console.error('Error fetching elections:', error);
    return [];
  }
}

export async function getElectionById(id: string): Promise<Election | null> {
  if (!db) return null;
  const docRef = doc(db, 'elections-simple', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Election : null;
}

export async function createElection(data: Omit<Election, 'id' | 'createdAt'>): Promise<string | null> {
  if (!db) return null;
  try {
    const electionsRef = collection(db, 'elections-simple');
    const newDoc = doc(electionsRef);
    await setDoc(newDoc, {
      ...data,
      createdAt: serverTimestamp(),
      stats: data.options.reduce((acc, opt) => ({ ...acc, [opt.id]: 0 }), {})
    });
    return newDoc.id;
  } catch (error) {
    console.error('Error creating election:', error);
    return null;
  }
}

export async function updateElection(id: string, data: Partial<Election>): Promise<void> {
  if (!db) return;
  const docRef = doc(db, 'elections-simple', id);
  await updateDoc(docRef, data);
}

export async function deleteElection(id: string): Promise<void> {
  if (!db) return;
  const docRef = doc(db, 'elections-simple', id);
  await deleteDoc(docRef);
}



export async function getUserVote(electionId: string, voterId: string): Promise<Vote | null> {
  if (!db) return null;
  const voteId = `${electionId}_${voterId}`;
  const docRef = doc(db, 'votes-simple', voteId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Vote : null;
}