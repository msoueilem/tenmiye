import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdvanceElectionDto {
  @ApiProperty({
    enum: ['nomination', 'dismissal', 'voting', 'completed', 'cancelled'],
    description: 'Target status to advance to',
  })
  @IsIn(['nomination', 'dismissal', 'voting', 'completed', 'cancelled'])
  status!: 'nomination' | 'dismissal' | 'voting' | 'completed' | 'cancelled';

  // Board nomination round timestamps
  @ApiPropertyOptional({ description: 'ISO 8601 — required when opening a nomination round' })
  @IsISO8601()
  @IsOptional()
  nominationStart?: string;

  @ApiPropertyOptional()
  @IsISO8601()
  @IsOptional()
  nominationEnd?: string;

  @ApiPropertyOptional()
  @IsISO8601()
  @IsOptional()
  dismissalStart?: string;

  @ApiPropertyOptional()
  @IsISO8601()
  @IsOptional()
  dismissalEnd?: string;

  // Board voting window
  @ApiPropertyOptional({ description: 'ISO 8601 — required when opening voting for board elections' })
  @IsISO8601()
  @IsOptional()
  votingStart?: string;

  @ApiPropertyOptional()
  @IsISO8601()
  @IsOptional()
  votingEnd?: string;

  @ApiPropertyOptional({ description: 'Reason — required when cancelling' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  reason?: string;
}
