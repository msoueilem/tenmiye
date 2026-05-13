import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePaymentChannelDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsBoolean()
  requiresCollector!: boolean;

  @IsString()
  @IsOptional()
  instructions?: string;
}
