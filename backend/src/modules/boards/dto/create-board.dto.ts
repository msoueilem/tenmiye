import { IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @IsIn(['executive', 'advisory', 'supervisory', 'special'])
  boardType!: 'executive' | 'advisory' | 'supervisory' | 'special';

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  term?: string;
}
