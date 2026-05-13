import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateElectionDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;
}
