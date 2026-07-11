import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

import { LOAN_APPLICATION_RULES } from '../loan-application.constants';

export class CreateLoanApplicationDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(LOAN_APPLICATION_RULES.MIN_REQUESTED_AMOUNT)
  @Max(LOAN_APPLICATION_RULES.MAX_REQUESTED_AMOUNT)
  requestedAmount!: number;

  @IsInt()
  @Min(LOAN_APPLICATION_RULES.MIN_TERM_MONTHS)
  @Max(LOAN_APPLICATION_RULES.MAX_TERM_MONTHS)
  requestedTermMonths!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  purpose?: string;
}
