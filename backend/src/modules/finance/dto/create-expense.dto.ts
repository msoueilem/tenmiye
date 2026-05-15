import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  description!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsIn(['activities', 'salary', 'equipment', 'administrative', 'other'])
  category!: 'activities' | 'salary' | 'equipment' | 'administrative' | 'other';

  @IsDateString()
  date!: string;
}
