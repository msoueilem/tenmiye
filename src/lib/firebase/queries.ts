import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from './client';
import { User } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface Admin {
  userId: string;
  name: string | null;
  email: string;
  phoneNumber: string | null;
  role: 'super-admin' | 'editor';
  status: 'active' | 'inactive' | 'blocked';
  createdAt: any;
  lastLogin: any;
}

export interface TeamMember {
  name: string;
  title: string;
  photo?: string;
}

export interface Team {
  team_name: string;
  head: TeamMember;
  members: TeamMember[];
}

export interface Initiative {
  title: string;
  description?: string;
  imageUrl?: string;
}

export interface ContactInfo {
  whatsapp: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface PublicLandingData {
  title?: string;
  logoUrl?: string;
  faviconUrl?: string;
  aboutText: string;
  membersCount: number;
  projectsCount?: number;
  activeProjectsCount?: number;
  contact: ContactInfo;
  initiatives: Initiative[];
  achievements?: string[];
  teamHierarchy: {
    teams: Team[];
  };
  currentAspect?: {
    title: string;
    subTitle: string;
    imageUrl: string;
  };
}

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
  
  // Filter out undefined values as Firestore doesn't support them
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  
  await updateDoc(docRef, cleanData);
}

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
      // Save URL in a central uploads collection
      const uploadRef = doc(db, 'uploads-simple', snapshot.ref.name.replace(/\./g, '_'));
      await setDoc(uploadRef, {
        url: downloadUrl,
        path: path,
        createdAt: serverTimestamp(),
        originalName: file.name,
      });
    } catch (firestoreError) {
      console.error('Storage upload succeeded but Firestore record failed:', firestoreError);
      // We still return the URL because the file IS in storage
      return downloadUrl;
    }

    return downloadUrl;
  } catch (error) {
    console.error('Full upload process failed:', error);
    return null;
  }
}

export async function checkAdminStatus(user: User): Promise<Admin | null> {
  if (!db || !user.email) return null;

  const adminDocRef = doc(db, 'admins-simple', user.email);
  const adminSnap = await getDoc(adminDocRef);

  if (adminSnap.exists()) {
    const adminData = adminSnap.data() as Admin;
    // Update last login
    await updateDoc(adminDocRef, {
      lastLogin: serverTimestamp(),
    });
    return { ...adminData, email: user.email };
  } else {
    // Create new record as inactive
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
