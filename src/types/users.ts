export interface UserMember {
  id: string;
  name: string;
  phoneNumber: string;
  status: 'active' | 'pending' | 'blocked';
  createdAt: any;
  notes?: string;
  votedElections?: string[];
  contribution?: number;
  totalContribution?: number;
  totalDonation?: number;
  monthsCovered?: number;
  photoUrl?: string;
  dateOfBirth?: string;
  occupation?: string;
  location?: string;
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
