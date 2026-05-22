import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose() id!: string;
  @Expose() fullName!: string;
  @Expose() fullNameAr!: string | null;
  @Expose() fullNameFr!: string | null;
  @Expose() phoneNumber!: string;
  @Expose() whatsappNumber!: string;
  @Expose() nationalId!: string | null;
  @Expose() city!: string | null;
  @Expose() regionId!: string | null;
  @Expose() roleId!: string;
  @Expose() tierId!: string;
  @Expose() profilePictureId!: string | null;
  @Expose() status!: string;
  @Expose() approvedBy!: string | null;
  @Expose() approvedAt!: unknown;
  @Expose() lastLoginAt!: unknown;
  @Expose() joinRequestId!: string | null;
  @Expose() outsidePlatform!: boolean;
  @Expose() isBlocked!: boolean;
  @Expose() outsideWhatsapp!: boolean;
  @Expose() createdAt!: unknown;
  @Expose() updatedAt!: unknown;
  // passwordHash is intentionally absent — never exposed
}
