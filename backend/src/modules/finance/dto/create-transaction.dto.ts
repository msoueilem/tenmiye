import { IsIn, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ enum: ['contribution', 'donation', 'expense'] })
  @IsIn(['contribution', 'donation', 'expense'])
  type!: 'contribution' | 'donation' | 'expense';

  @ApiProperty({ example: 90 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: '2026-05-01', description: 'ISO 8601 date — when the transaction occurred' })
  @IsISO8601()
  date!: string;

  @ApiProperty({ description: 'Payment channel ID' })
  @IsString()
  @IsNotEmpty()
  paymentChannelId!: string;

  // ─── Cash only ───────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Cash only — note if someone else physically collected the money' })
  @IsString()
  @IsOptional()
  receivedByNote?: string;

  // ─── Mobile only ─────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Mobile only — upload ID of the payment screenshot' })
  @IsString()
  @IsOptional()
  screenshotUploadId?: string;

  // ─── Contributions and donations ─────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'User ID of who paid — required for contributions' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: '2026-05', description: 'Contributions only — month this payment covers (YYYY-MM)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'period must be in YYYY-MM format' })
  period?: string;

  // ─── Expenses ────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Expenses only — who the expense was paid to' })
  @IsString()
  @IsOptional()
  paidTo?: string;

  @ApiPropertyOptional({ description: 'Expenses only — what it was spent on' })
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiPropertyOptional({ description: 'Expenses only — upload ID of the receipt' })
  @IsString()
  @IsOptional()
  receiptUploadId?: string;

  // ─── Common ──────────────────────────────────────────────────────────────────

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
