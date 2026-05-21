import { apiFetch } from '@/lib/api';
import type { Announcement, CreateAnnouncementDto, UpdateAnnouncementDto } from '@/types/announcements';

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  return apiFetch<Announcement[]>('GET', '/announcements');
}

export async function getAllAnnouncements(tokenType: 'admin' | 'member' = 'member'): Promise<Announcement[]> {
  return apiFetch<Announcement[]>('GET', '/announcements/all', { tokenType });
}

export async function createAnnouncement(dto: CreateAnnouncementDto, tokenType: 'admin' | 'member' = 'member'): Promise<Announcement> {
  return apiFetch<Announcement>('POST', '/announcements', { body: dto, tokenType });
}

export async function updateAnnouncement(id: string, dto: UpdateAnnouncementDto, tokenType: 'admin' | 'member' = 'member'): Promise<Announcement> {
  return apiFetch<Announcement>('PATCH', `/announcements/${id}`, { body: dto, tokenType });
}

export async function deleteAnnouncement(id: string, tokenType: 'admin' | 'member' = 'admin'): Promise<void> {
  return apiFetch<void>('DELETE', `/announcements/${id}`, { tokenType });
}
