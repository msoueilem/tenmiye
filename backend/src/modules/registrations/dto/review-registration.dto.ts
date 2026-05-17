import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewRegistrationDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @ApiPropertyOptional({ description: 'Required when status is rejected' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
