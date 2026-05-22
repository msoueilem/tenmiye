import { apiFetch } from '@/lib/api';
import type { AdminAccount, CreateAdminAccountDto, UpdateAdminAccountDto } from '@/types/admin-accounts';

export function getAdminAccounts(): Promise<AdminAccount[]> {
  return apiFetch('GET', '/admin-accounts', { tokenType: 'admin' });
}

export function getAdminAccount(id: string): Promise<AdminAccount> {
  return apiFetch('GET', `/admin-accounts/${id}`, { tokenType: 'admin' });
}

export function createAdminAccount(dto: CreateAdminAccountDto): Promise<{ id: string }> {
  return apiFetch('POST', '/admin-accounts', { body: dto, tokenType: 'admin' });
}

export function updateAdminAccount(id: string, dto: UpdateAdminAccountDto): Promise<void> {
  return apiFetch('PATCH', `/admin-accounts/${id}`, { body: dto, tokenType: 'admin' });
}

export function deleteAdminAccount(id: string): Promise<void> {
  return apiFetch('DELETE', `/admin-accounts/${id}`, { tokenType: 'admin' });
}
