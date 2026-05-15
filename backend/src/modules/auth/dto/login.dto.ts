import { IsNotEmpty, IsString, Matches } from 'class-validator';

const PHONE_REGEX = /^[234]\d{7}$/;

export class LoginDto {
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Phone must be 8 digits starting with 2, 3, or 4' })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
