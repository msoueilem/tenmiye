import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsIn(['active', 'inactive', 'pending', 'blocked'])
  @IsOptional()
  status?: 'active' | 'inactive' | 'pending' | 'blocked';

  @IsString()
  @IsOptional()
  approvedBy?: string;
}
