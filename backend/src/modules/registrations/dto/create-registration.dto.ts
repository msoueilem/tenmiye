import { IsString, IsNotEmpty, Matches, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRegistrationDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) fullName!: string;
  @ApiProperty({ description: '8-digit Mauritanian number (2/3/4xxxxxxx)' })
  @Matches(/^[234]\d{7}$/, { message: 'phone must be 8 digits starting with 2, 3, or 4' })
  phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) message?: string;
}
