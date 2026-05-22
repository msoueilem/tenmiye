import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ enum: ['active', 'inactive', 'pending', 'blocked'] })
  @IsIn(['active', 'inactive', 'pending', 'blocked'])
  @IsOptional()
  status?: 'active' | 'inactive' | 'pending' | 'blocked';

  @IsString()
  @IsOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  outsideWhatsapp?: boolean;
}
