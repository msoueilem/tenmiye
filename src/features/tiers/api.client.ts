import { apiFetch } from '@/lib/api';
import type { Tier, CreateTierDto, UpdateTierDto } from '@/types/tiers';

export function getTiers(): Promise<Tier[]> {
  return apiFetch('GET', '/tiers', { tokenType: 'member' });
}

export function getTier(id: string): Promise<Tier> {
  return apiFetch('GET', `/tiers/${id}`, { tokenType: 'member' });
}

export function createTier(dto: CreateTierDto): Promise<Tier> {
  return apiFetch('POST', '/tiers', { body: dto, tokenType: 'member' });
}

export function updateTier(id: string, dto: UpdateTierDto): Promise<Tier> {
  return apiFetch('PATCH', `/tiers/${id}`, { body: dto, tokenType: 'member' });
}

export function deleteTier(id: string): Promise<void> {
  return apiFetch('DELETE', `/tiers/${id}`, { tokenType: 'member' });
}
