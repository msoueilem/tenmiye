import { IsArray, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permission } from '../../../common/enums/permission.enum';

export class CreateAdminAccountDto {
  @ApiProperty({ description: 'Google email used to sign in' })
  @IsEmail()
  googleEmail!: string;

  @ApiPropertyOptional({ description: 'Linked member user ID (optional)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ enum: Permission, isArray: true })
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions!: Permission[];
}
