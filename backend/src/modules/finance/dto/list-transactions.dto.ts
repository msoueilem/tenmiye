import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListTransactionsDto {
  @ApiPropertyOptional({ enum: ['contribution', 'donation', 'expense'] })
  @IsIn(['contribution', 'donation', 'expense'])
  @IsOptional()
  type?: 'contribution' | 'donation' | 'expense';

  @ApiPropertyOptional({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;

  @ApiPropertyOptional({ description: 'Filter by member userId (contributions/donations)' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Last document ID from previous page' })
  @IsString()
  @IsOptional()
  cursor?: string;
}
