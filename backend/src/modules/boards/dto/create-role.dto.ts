import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  title!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  permissions?: string[];

  @IsDateString()
  @IsOptional()
  startDate?: string;
}
