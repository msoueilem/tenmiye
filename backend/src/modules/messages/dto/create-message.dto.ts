import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional({ description: '8-digit Mauritanian number (2/3/4xxxxxxx)' })
  @IsOptional()
  @Matches(/^[234]\d{7}$/, { message: 'phone must be 8 digits starting with 2, 3, or 4' })
  phone?: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(1000) body!: string;
}
