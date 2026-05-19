import { apiFetch } from '@/lib/api';
import type { Announcement, CreateAnnouncementDto, UpdateAnnouncementDto } from '@/types/announcements';

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  return apiFetch<Announcement[]>('GET', '/announcements');
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  return apiFetch<Announcement[]>('GET', '/announcements/all', { tokenType: 'member' });
}

export async function createAnnouncement(dto: CreateAnnouncementDto): Promise<Announcement> {
  return apiFetch<Announcement>('POST', '/announcements', { body: dto, tokenType: 'member' });
}

export async function updateAnnouncement(id: string, dto: UpdateAnnouncementDto): Promise<Announcement> {
  return apiFetch<Announcement>('PATCH', `/announcements/${id}`, { body: dto, tokenType: 'member' });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  return apiFetch<void>('DELETE', `/announcements/${id}`, { tokenType: 'admin' });
}
