import { IsString, IsNotEmpty, IsArray, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permission } from '../../../common/enums/permission.enum';

export class CreateRoleDto {
  @ApiProperty({ example: 'عضو' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'member' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['متابعة القرارات', 'المشاركة في التصويت'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  responsibilities?: string[];

  @ApiProperty({ enum: Permission, isArray: true })
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions!: Permission[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
