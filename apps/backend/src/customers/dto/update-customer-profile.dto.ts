import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
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

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nationalIdNumber?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(32)
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
}
