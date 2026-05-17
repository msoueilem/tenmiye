import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ElectionOptionDto {
  @ApiProperty({ example: 'opt-yes' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: 'نعم' })
  @IsString()
  @IsNotEmpty()
  label!: string;
}

export class BoardConfigDto {
  @ApiProperty({ example: 3, description: 'Number of seats to fill' })
  @IsInt()
  @IsPositive()
  seatsCount!: number;

  @ApiPropertyOptional({ description: 'Ideal nominee pool size — defaults to seatsCount × 2' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  targetNominees?: number;

  @ApiPropertyOptional({ default: 2, description: 'Shortlist size for runners-up' })
  @IsInt()
  @Min(1)
  @IsOptional()
  shortlistCount?: number;

  @ApiPropertyOptional({ default: 24, description: 'Hours nominees have to opt out before auto-confirmed' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  dismissalWindowHours?: number;
}

export class CreateElectionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ['yes_no', 'multiple_choice', 'board'] })
  @IsIn(['yes_no', 'multiple_choice', 'board'])
  type!: 'yes_no' | 'multiple_choice' | 'board';

  @ApiPropertyOptional({
    type: [ElectionOptionDto],
    description: 'Required for yes_no and multiple_choice elections',
  })
  @ValidateIf((o: CreateElectionDto) => o.type !== 'board')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ElectionOptionDto)
  options?: ElectionOptionDto[];

  @ApiPropertyOptional({ description: 'ISO 8601 — voting window start (yes_no / multiple_choice)' })
  @IsISO8601()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 — voting window end (yes_no / multiple_choice)' })
  @IsISO8601()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Required for board elections' })
  @ValidateIf((o: CreateElectionDto) => o.type === 'board')
  @ValidateNested()
  @Type(() => BoardConfigDto)
  boardConfig?: BoardConfigDto;
}
