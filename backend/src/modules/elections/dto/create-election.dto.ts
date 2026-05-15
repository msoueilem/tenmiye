import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateElectionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['board_election', 'committee_election', 'general_vote'])
  type!: 'board_election' | 'committee_election' | 'general_vote';

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;
}
