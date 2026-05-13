import { IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

const PHONE_REGEX = /^[234]\d{7}$/;
const PHONE_MESSAGE = 'Must be 8 digits starting with 2, 3, or 4';

const NATIONAL_ID_REGEX = /^\d{10}$/;
const NATIONAL_ID_MESSAGE = 'National ID must be exactly 10 digits';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  fullNameAr?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  fullNameFr?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  whatsappNumber!: string;

  @IsString()
  @IsOptional()
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  @Matches(NATIONAL_ID_REGEX, { message: NATIONAL_ID_MESSAGE })
  nationalId?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  city?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  tierId?: string;

  @IsString()
  @IsOptional()
  profilePictureId?: string;
}
