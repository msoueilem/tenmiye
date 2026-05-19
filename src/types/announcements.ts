export type AnnouncementType = 'info' | 'warning' | 'event';

export interface Announcement {
  id: string;
  message: string;
  type: AnnouncementType;
  isActive: boolean;
  startDate: string;
  endDate: string;
  ctaLabel?: string;
  ctaUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementDto {
  message: string;
  type: AnnouncementType;
  isActive: boolean;
  startDate: string;
  endDate: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface UpdateAnnouncementDto extends Partial<CreateAnnouncementDto> {}
