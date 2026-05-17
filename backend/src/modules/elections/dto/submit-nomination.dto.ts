import { ArrayMinSize, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitNominationDto {
  @ApiProperty({
    type: [String],
    description: 'User IDs to nominate — must equal seatsCount for board elections',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  nominees!: string[];
}
