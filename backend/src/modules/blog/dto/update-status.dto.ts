import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateStatusDto {
  @IsIn(['draft', 'published', 'archived'])
  @IsNotEmpty()
  status!: 'draft' | 'published' | 'archived';
}
