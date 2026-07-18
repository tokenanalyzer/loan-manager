import { IsIn, IsNumber, IsOptional, IsPositive, IsString, MaxLength, ValidateIf } from 'class-validator';

export type LoanApplicationDecision = 'approve' | 'reject' | 'query';

export class ReviewLoanApplicationDto {
  @IsIn(['approve', 'reject', 'query'])
  decision!: LoanApplicationDecision;

  /** Required when `decision === 'approve'` — the Loan needs a rate. */
  @ValidateIf((dto: ReviewLoanApplicationDto) => dto.decision === 'approve')
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  interestRate?: number;

  /** Required when `decision === 'query'` — shown to the customer verbatim. */
  @ValidateIf((dto: ReviewLoanApplicationDto) => dto.decision === 'query')
  @IsString()
  @MaxLength(2_000)
  queryMessage?: string;

  /** Optional even on reject — a reviewer isn't forced to type one, though the customer notification is clearer when they do. */
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  rejectionReason?: string;
}
