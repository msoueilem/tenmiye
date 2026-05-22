import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DeleteUploadDto {
  @ApiPropertyOptional({ enum: ['parent-deleted', 'manual', 'replaced', 'rejected'] })
  @IsOptional()
  @IsString()
  deletionReason?: 'parent-deleted' | 'manual' | 'replaced' | 'rejected';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deletionNote?: string;
}
