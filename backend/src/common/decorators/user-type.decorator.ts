import { SetMetadata } from '@nestjs/common';

export const USER_TYPE_KEY = 'user_type';
export const RequireUserType = (type: 'member' | 'admin') =>
  SetMetadata(USER_TYPE_KEY, type);
