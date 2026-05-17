import {
  IsArray,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AchievementDto {
  @ApiProperty({ example: 'إطلاق موقع الجمعية' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'تم إطلاق الموقع الرسمي للجمعية في مارس 2025' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ example: '2025-03-15' })
  @IsISO8601()
  @IsOptional()
  date?: string;
}

export class CreateBoardDto {
  @ApiProperty({ example: 'مجلس الإدارة 2024-2026' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [String], description: 'Role IDs assigned to this board' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[];

  @ApiPropertyOptional({ description: 'Upload ID for the board logo' })
  @IsString()
  @IsOptional()
  logoUploadId?: string;

  @ApiProperty({ example: '2024-01-01', description: 'ISO 8601 date — when this board term starts' })
  @IsISO8601()
  termStartDate!: string;

  @ApiProperty({ example: '2026-01-01', description: 'ISO 8601 date — when this board term ends and a new election is required' })
  @IsISO8601()
  termEndDate!: string;

  @ApiPropertyOptional({ enum: ['upcoming', 'active', 'completed'], default: 'upcoming' })
  @IsIn(['upcoming', 'active', 'completed'])
  @IsOptional()
  status?: 'upcoming' | 'active' | 'completed';

  @ApiPropertyOptional({
    type: [String],
    description: 'Mandates from the org — what this board is tasked with',
    example: ['إدارة الميزانية السنوية', 'تنظيم الاجتماعات الدورية'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mandates?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: "Org's obligations toward board members — resources, support, compensation",
    example: ['تغطية مصاريف التنقل', 'توفير مساحة عمل'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  obligations?: string[];

  @ApiPropertyOptional({ type: [AchievementDto], description: 'What this board accomplished during its term' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AchievementDto)
  @IsOptional()
  achievements?: AchievementDto[];

  @ApiPropertyOptional({ description: 'Election ID that produced this board' })
  @IsString()
  @IsOptional()
  electionId?: string;

  @ApiPropertyOptional({ description: 'Board ID this board replaced' })
  @IsString()
  @IsOptional()
  predecessorBoardId?: string;
}
