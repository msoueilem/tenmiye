export interface MemberSearchResult {
  id: string;
  name: string;
  fullNameAr: string | null;
}

export interface UserMember {
  id: string;
  fullName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  nationalId?: string | null;
  status: 'active' | 'inactive' | 'pending' | 'blocked';
  isBlocked: boolean;
  outsideWhatsapp: boolean;
  roleId?: string;
  tierId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Admin {
  userId: string;
  name: string | null;
  email: string;
  phoneNumber: string | null;
  role: 'super-admin' | 'editor';
  status: 'active' | 'inactive' | 'blocked';
  permissions: string[];
  createdAt: string;
  lastLogin: string;
}
