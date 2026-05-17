import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTierDto {
  @ApiProperty({ example: 'أساسي' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'basic' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 90 })
  @IsNumber()
  @IsPositive()
  monthlyAmount!: number;
}
