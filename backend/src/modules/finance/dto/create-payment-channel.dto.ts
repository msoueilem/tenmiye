import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentChannelDto {
  @ApiProperty({ example: 'Masrvi' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: ['mobile', 'cash'] })
  @IsIn(['mobile', 'cash'])
  type!: 'mobile' | 'cash';

  @ApiPropertyOptional({ example: '22341234', description: 'Mobile wallet number — required when type is mobile' })
  @IsString()
  @IsOptional()
  walletNumber?: string;

  @ApiPropertyOptional({ example: 'محمد ولد أحمد', description: 'Account holder name — required when type is mobile' })
  @IsString()
  @IsOptional()
  walletOwner?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
