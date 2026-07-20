import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  LOAN_APPLICATION_RULES,
  LOAN_REQUEST_TYPES,
  LoanRequestType,
} from '../loan-application.constants';

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

  /**
   * Matches a `LoanCategory.id` from the Customer App's static catalog
   * (e.g. `'personal'`, `'home'`, `'gold'`). Optional — when present, the
   * service validates `requestedAmount`/`requestedTermMonths` against
   * that category's own (tighter) bounds in `LOAN_CATEGORY_BOUNDS`,
   * on top of the global bounds already enforced by the `@Min`/`@Max`
   * decorators above.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId?: string;

  /**
   * Request-type reservation — omit for the default (`FRESH_LOAN`).
   * `TOP_UP`/`BALANCE_TRANSFER`/`BT_TOPUP`/`BT_FRESH` are accepted but
   * not yet exercised by any client — reserved ahead of the Customer
   * Benefits module.
   */
  @IsOptional()
  @IsIn(LOAN_REQUEST_TYPES)
  requestType?: LoanRequestType;
}
