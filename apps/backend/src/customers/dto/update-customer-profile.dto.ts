import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * All fields optional — this is a partial update (PATCH semantics).
 * No field here is required to create a UserEntity/sign in; profile
 * completion is entirely separate from authentication (see Phase 4's
 * schema-correction note on why email/fullName are nullable).
 *
 * Phase 6 adds `marketingConsent` (Privacy Settings toggle) and
 * `acceptDataConsent` (a one-way "I accept" action — see
 * CustomersService.upsertOwnProfile for why there's no way to unset
 * `dataConsentAcceptedAt` through this DTO).
 */
export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  /** Format: 5 letters, 4 digits, 1 letter (e.g. `ABCDE1234F`). */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, {
    message: 'panNumber must be a valid PAN (e.g. ABCDE1234F).',
  })
  panNumber?: string;

  /**
   * Write-only: the full 12-digit Aadhaar number. Never stored as-is
   * and never echoed back — `CustomersService` hashes it (salted
   * SHA-256) and keeps only the last 4 digits for display. See
   * `CustomerProfileResponseDto` for what actually comes back.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{12}$/, { message: 'aadhaarNumber must be exactly 12 digits.' })
  aadhaarNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  state?: string;

  /** Indian PIN code — 6 digits, first digit 1-9 (never 0). */
  @IsOptional()
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'postalCode must be a valid 6-digit Indian PIN code.' })
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  employmentStatus?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monthlyIncome?: number;

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  /** One-way: `true` records acceptance now; `false`/omitted changes nothing. */
  @IsOptional()
  @IsBoolean()
  acceptDataConsent?: boolean;

  /** Indian bank account numbers are 9-18 digits depending on the bank. */
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{9,18}$/, {
    message: 'bankAccountNumber must be 9-18 digits.',
  })
  bankAccountNumber?: string;

  /** Format: 4 letters, a literal `0`, 6 alphanumeric (e.g. `HDFC0001234`). */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'bankIfscCode must be a valid IFSC code (e.g. HDFC0001234).',
  })
  bankIfscCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankAccountHolderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nomineeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nomineeRelationship?: string;
}
