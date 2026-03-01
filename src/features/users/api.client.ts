import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, deleteDoc, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { User } from 'firebase/auth';
import { UserMember, Admin } from '@/types/users';

export async function searchMembers(queryStr: string): Promise<UserMember[]> {
  if (!db || queryStr.length < 2) return [];
  const usersRef = collection(db, 'users-simple');
  const q = query(
    usersRef, 
    where('status', '==', 'active'),
    orderBy('name'),
    where('name', '>=', queryStr),
    where('name', '<=', queryStr + '\uf8ff')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserMember));
}

export async function updateVoterProfile(id: string, data: { name?: string, photoUrl?: string }): Promise<void> {
  if (!db) return;
  const docRef = doc(db, 'users-simple', id);
  await updateDoc(docRef, data);
}

export async function getMemberByPhone(phone: string): Promise<UserMember | null> {
  if (!db) return null;
  const usersRef = collection(db, 'users-simple');
  const q = query(usersRef, where('phoneNumber', '==', phone));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as UserMember;
}

export async function getAllUsers(): Promise<UserMember[]> {
  if (!db) return [];
  try {
    const usersRef = collection(db, 'users-simple');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserMember));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function addUser(data: Omit<UserMember, 'id' | 'createdAt'>): Promise<string | null> {
  if (!db) return null;
  try {
    const usersRef = collection(db, 'users-simple');
    const newDocRef = doc(usersRef);
    await setDoc(newDocRef, {
      ...data,
      createdAt: serverTimestamp(),
    });
    return newDocRef.id;
  } catch (error) {
    console.error('Error adding user:', error);
    return null;
  }
}

export async function updateUser(id: string, data: Partial<UserMember>): Promise<void> {
  if (!db) return;
  const userDocRef = doc(db, 'users-simple', id);
  await updateDoc(userDocRef, data);
}

export async function deleteUser(id: string): Promise<void> {
  if (!db) return;
  const userDocRef = doc(db, 'users-simple', id);
  await deleteDoc(userDocRef);
}

export async function getAllAdmins(): Promise<Admin[]> {
  if (!db) return [];
  try {
    const adminsRef = collection(db, 'admins-simple');
    const q = query(adminsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), email: doc.id } as Admin));
  } catch (error) {
    console.error('Error fetching admins:', error);
    return [];
  }
}

export async function updateAdmin(email: string, data: Partial<Admin>): Promise<void> {
  if (!db) return;
  const adminDocRef = doc(db, 'admins-simple', email);
  await updateDoc(adminDocRef, data);
}

export async function deleteAdmin(email: string): Promise<void> {
  if (!db) return;
  const adminDocRef = doc(db, 'admins-simple', email);
  await deleteDoc(adminDocRef);
}

export async function checkAdminStatus(user: User): Promise<Admin | null> {
  if (!db || !user.email) return null;

  const adminDocRef = doc(db, 'admins-simple', user.email);
  const adminSnap = await getDoc(adminDocRef);

  if (adminSnap.exists()) {
    const adminData = adminSnap.data() as Admin;
    await updateDoc(adminDocRef, {
      lastLogin: serverTimestamp(),
    });
    return { ...adminData, email: user.email };
  } else {
    const newAdmin: Partial<Admin> = {
      userId: user.uid,
      name: user.displayName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: 'editor',
      status: 'inactive',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };
    await setDoc(adminDocRef, newAdmin);
    return newAdmin as Admin;
  }
}