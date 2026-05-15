import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class SubmitNominationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  nomineeUids!: string[];
}
