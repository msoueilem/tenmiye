import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateContributionDto {
  @IsString()
  @IsNotEmpty()
  paymentChannelId!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  @IsOptional()
  collectedByUserId?: string;

  @IsString()
  @IsOptional()
  screenshotUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
