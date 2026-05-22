import { apiFetch, tokenStore } from '@/lib/api';
import { UserMember, Admin, MemberSearchResult } from '@/types/users';

// ─── Members ──────────────────────────────────────────────────────────────────

export async function searchMembers(queryStr: string): Promise<MemberSearchResult[]> {
  if (queryStr.length < 2) return [];
  return apiFetch('GET', `/me/members/search?q=${encodeURIComponent(queryStr)}`, {
    tokenType: 'member',
  });
}

export async function getMemberByPhone(phone: string): Promise<{ isMember: boolean; hasPassword: boolean } | null> {
  const result = await apiFetch<{ isMember: boolean; hasPassword: boolean }>(
    'POST',
    '/auth/phone/check',
    { body: { phone } },
  );
  return result.isMember ? result : null;
}

export async function updateVoterProfile(id: string, data: { name?: string; photoUrl?: string }): Promise<void> {
  await apiFetch('PATCH', `/users/${id}`, { body: data, tokenType: 'member' });
}

export async function getAllUsers(): Promise<UserMember[]> {
  return apiFetch('GET', '/users', { tokenType: 'admin' });
}

export async function addUser(data: Omit<UserMember, 'id' | 'createdAt'>): Promise<string | null> {
  const result = await apiFetch<{ id: string }>('POST', '/users', {
    body: data,
    tokenType: 'admin',
  });
  return result.id;
}

export async function updateUser(id: string, data: Partial<UserMember>): Promise<void> {
  await apiFetch('PATCH', `/users/${id}`, { body: data, tokenType: 'admin' });
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch('DELETE', `/users/${id}`, { tokenType: 'admin' });
}

// ─── Admin accounts ───────────────────────────────────────────────────────────

export async function getAllAdmins(): Promise<Admin[]> {
  return apiFetch('GET', '/admin-accounts', { tokenType: 'admin' });
}

export async function updateAdmin(id: string, data: Partial<Admin>): Promise<void> {
  await apiFetch('PATCH', `/admin-accounts/${id}`, { body: data, tokenType: 'admin' });
}

export async function deleteAdmin(id: string): Promise<void> {
  await apiFetch('DELETE', `/admin-accounts/${id}`, { tokenType: 'admin' });
}

// checkAdminStatus is no longer needed — admin identity comes from the JWT in tokenStore.
// Call decodeJwt(tokenStore.getAccess('admin')!) to read userId/permissions/googleEmail.
export { tokenStore };
