import { IsBoolean, IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'اجتماع الجمعية العامة يوم السبت القادم' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message!: string;

  @ApiProperty({ enum: ['info', 'warning', 'event'] })
  @IsIn(['info', 'warning', 'event'])
  type!: 'info' | 'warning' | 'event';

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ISO 8601 date — show from this date' })
  @IsISO8601()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date — hide after this date' })
  @IsISO8601()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 'سجّل الآن' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  ctaLabel?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  ctaUrl?: string;
}
