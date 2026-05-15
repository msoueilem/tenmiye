import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) fullNameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) fullNameFr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() profilePictureId?: string;
  @ApiPropertyOptional({ description: '8-digit Mauritanian number (2/3/4xxxxxxx)' })
  @IsOptional()
  @Matches(/^[234]\d{7}$/, { message: 'phoneNumber must be 8 digits starting with 2, 3, or 4' })
  phoneNumber?: string;
}
