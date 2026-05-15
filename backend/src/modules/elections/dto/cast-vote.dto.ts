import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CastVoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  selections!: string[];
}
