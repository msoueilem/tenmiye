export type AdminAccountStatus = 'active' | 'inactive';

export interface AdminAccount {
  id: string;
  googleEmail: string;
  userId?: string;
  permissions: string[];
  status: AdminAccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminAccountDto {
  googleEmail: string;
  userId?: string;
  permissions: string[];
}

export interface UpdateAdminAccountDto {
  permissions?: string[];
  status?: AdminAccountStatus;
}
