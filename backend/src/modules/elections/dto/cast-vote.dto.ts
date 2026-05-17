import { ArrayMinSize, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CastVoteDto {
  @ApiProperty({
    type: [String],
    description:
      'Option IDs (yes_no: 1 choice, multiple_choice: N choices) or user IDs (board: exactly seatsCount)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  choices!: string[];
}
