// Mirrors backend Permission enum — keep in sync with backend/src/common/enums/permission.enum.ts
export const Permission = {
  READ_ALL: 'READ_ALL',
  READ_MESSAGES: 'READ_MESSAGES',
  MANAGE_REGISTRATIONS: 'MANAGE_REGISTRATIONS',
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_BOARDS: 'MANAGE_BOARDS',
  MANAGE_ELECTIONS: 'MANAGE_ELECTIONS',
  MANAGE_FINANCE: 'MANAGE_FINANCE',
  MANAGE_ANNOUNCEMENTS: 'MANAGE_ANNOUNCEMENTS',
  MANAGE_TIERS: 'MANAGE_TIERS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  MODERATE_BLOG: 'MODERATE_BLOG',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];
