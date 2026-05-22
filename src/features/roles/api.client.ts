import { apiFetch } from '@/lib/api';
import type { Role, CreateRoleDto, UpdateRoleDto } from '@/types/roles';

export function getRoles(): Promise<Role[]> {
  return apiFetch('GET', '/roles', { tokenType: 'member' });
}

export function getRole(id: string): Promise<Role> {
  return apiFetch('GET', `/roles/${id}`, { tokenType: 'member' });
}

export function createRole(dto: CreateRoleDto): Promise<Role> {
  return apiFetch('POST', '/roles', { body: dto, tokenType: 'member' });
}

export function updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
  return apiFetch('PATCH', `/roles/${id}`, { body: dto, tokenType: 'member' });
}

export function deleteRole(id: string): Promise<void> {
  return apiFetch('DELETE', `/roles/${id}`, { tokenType: 'member' });
}
