import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, deleteDoc, query, orderBy, where, arrayUnion } from 'firebase/firestore';
import { db, storage } from './client';
import { User } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface ElectionOption {
  id: string;
  name: string;
  photoUrl?: string;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  type: 'choice' | 'yes-no' | 'nomination';
  status: 'draft' | 'active' | 'closed';
  resultsVisibility: 'always' | 'after_close' | 'admin_always' | 'admin_after_close';
  startTime: any;
  endTime: any;
  minSelections?: number;
  maxSelections?: number;
  options: ElectionOption[];
  createdAt: any;
  stats?: { [optionId: string]: number };
}

export interface Vote {
  id: string;
  electionId: string;
  voterId: string;
  selections: string[];
  votedAt: any;
}

export async function searchMembers(queryStr: string): Promise<UserMember[]> {
  if (!db || queryStr.length < 2) return [];
  const usersRef = collection(db, 'users-simple');
  // Basic prefix search
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

export async function updateVoterProfile(id: string, data: { name?: string, photoUrl?: string, password?: string }): Promise<void> {
  if (!db) return;
  const docRef = doc(db, 'users-simple', id);
  await updateDoc(docRef, data);
}

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

export async function castVote(electionId: string, voterId: string, selections: string[]): Promise<boolean> {
  if (!db) return false;
  try {
    const voteId = `${electionId}_${voterId}`;
    const voteRef = doc(db, 'votes-simple', voteId);
    
    // Check if already voted
    const voteSnap = await getDoc(voteRef);
    if (voteSnap.exists()) return false;

    // Use a basic batch set instead of transaction for simplicity in this landing page
    await setDoc(voteRef, {
      electionId,
      voterId,
      selections,
      votedAt: serverTimestamp(),
    });

    // Mark as voted in the member record
    const userRef = doc(db, 'users-simple', voterId);
    await updateDoc(userRef, {
      votedElections: arrayUnion(electionId)
    });

    // Update stats
    const electionRef = doc(db, 'elections-simple', electionId);
    const electionSnap = await getDoc(electionRef);
    if (electionSnap.exists()) {
      const stats = electionSnap.data().stats || {};
      selections.forEach(sel => {
        stats[sel] = (stats[sel] || 0) + 1;
      });
      await updateDoc(electionRef, { stats });
    }

    return true;
  } catch (error) {
    console.error('Error casting vote:', error);
    return false;
  }
}

export async function getUserVote(electionId: string, voterId: string): Promise<Vote | null> {
  if (!db) return null;
  const voteId = `${electionId}_${voterId}`;
  const docRef = doc(db, 'votes-simple', voteId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Vote : null;
}

export async function getMemberByPhone(phone: string): Promise<UserMember | null> {
  if (!db) return null;
  const usersRef = collection(db, 'users-simple');
  const q = query(usersRef, where('phoneNumber', '==', phone));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as UserMember;
}

export interface UserMember {
  id: string;
  name: string;
  phoneNumber: string;
  status: 'active' | 'pending' | 'blocked';
  createdAt: any;
  notes?: string;
  password?: string;
  votedElections?: string[];
  // Financials
  contribution?: number;
  totalContribution?: number;
  totalDonation?: number;
  monthsCovered?: number;
  // Profile
  photoUrl?: string;
  dateOfBirth?: string;
  occupation?: string;
  location?: string;
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
    const docRef = await setDoc(doc(usersRef), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return 'success';
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
