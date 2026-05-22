import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateElectionDto } from './create-election.dto';

export class UpdateElectionDto extends PartialType(CreateElectionDto) {
  @IsOptional()
  @IsIn(['draft', 'nomination', 'dismissal', 'voting', 'completed', 'cancelled'])
  status?: 'draft' | 'nomination' | 'dismissal' | 'voting' | 'completed' | 'cancelled';
}
