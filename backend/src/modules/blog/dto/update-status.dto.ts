import { IsIn, IsString } from 'class-validator';

export class UpdateStatusDto {
  @IsString()
  @IsIn(['draft', 'published', 'archived'])
  status!: 'draft' | 'published' | 'archived';
}
