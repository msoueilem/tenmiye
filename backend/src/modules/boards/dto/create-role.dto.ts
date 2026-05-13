import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  boardId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  permissions?: string[];
}
