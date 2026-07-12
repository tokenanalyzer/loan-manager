import { IsIn, IsNumber, IsPositive, ValidateIf } from 'class-validator';

export type LoanApplicationDecision = 'approve' | 'reject';

export class ReviewLoanApplicationDto {
  @IsIn(['approve', 'reject'])
  decision!: LoanApplicationDecision;

  /** Required when `decision === 'approve'` — the Loan needs a rate. */
  @ValidateIf((dto: ReviewLoanApplicationDto) => dto.decision === 'approve')
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  interestRate?: number;
}
