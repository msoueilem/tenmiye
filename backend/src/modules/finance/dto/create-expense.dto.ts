import { IsDateString, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsDateString()
  date!: string;
}
