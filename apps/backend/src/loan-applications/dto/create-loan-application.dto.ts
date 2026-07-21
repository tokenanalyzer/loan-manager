import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import {
  LOAN_APPLICATION_RULES,
  LOAN_REQUEST_TYPES,
  LoanRequestType,
  PROPERTY_OWNERSHIP_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from '../loan-application.constants';

const isLap = (dto: CreateLoanApplicationDto): boolean => dto.categoryId === 'lap';

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
   * (e.g. `'personal'`, `'home'`, `'lap'`). Optional — when present, the
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

  /**
   * Loan Against Property (`categoryId: 'lap'`) collateral facts —
   * only validated/required when `categoryId === 'lap'`; ignored
   * (left undefined) for every other category.
   */
  @ValidateIf(isLap)
  @IsIn(PROPERTY_TYPE_OPTIONS)
  propertyType?: string;

  @ValidateIf(isLap)
  @IsIn(PROPERTY_OWNERSHIP_OPTIONS)
  propertyOwnership?: string;

  @ValidateIf(isLap)
  @IsString()
  @MaxLength(500)
  propertyAddress?: string;

  @ValidateIf(isLap)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  propertyValue?: number;

  @ValidateIf(isLap)
  @IsBoolean()
  hasExistingLoanOnProperty?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  existingLoanOutstandingAmount?: number;
}
