import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  sessionInfo!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
