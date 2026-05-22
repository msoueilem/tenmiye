import { IsISO8601, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateScheduleDto {
  @ApiPropertyOptional() @IsISO8601() @IsOptional() nominationStart?: string;
  @ApiPropertyOptional() @IsISO8601() @IsOptional() nominationEnd?: string;
  @ApiPropertyOptional() @IsISO8601() @IsOptional() dismissalStart?: string;
  @ApiPropertyOptional() @IsISO8601() @IsOptional() dismissalEnd?: string;
  @ApiPropertyOptional() @IsISO8601() @IsOptional() votingStart?: string;
  @ApiPropertyOptional() @IsISO8601() @IsOptional() votingEnd?: string;
  @ApiPropertyOptional() @IsISO8601() @IsOptional() startTime?: string;
  @ApiPropertyOptional() @IsISO8601() @IsOptional() endTime?: string;
}
