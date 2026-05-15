import { Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckPhoneDto {
  @ApiProperty({ description: '8-digit Mauritanian number (2/3/4xxxxxxx)' })
  @Matches(/^[234]\d{7}$/, { message: 'phone must be 8 digits starting with 2, 3, or 4' })
  phone!: string;
}
