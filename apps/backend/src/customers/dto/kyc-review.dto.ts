import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Staff decision on a customer's self-attested PAN/Aadhaar KYC
 * submission. `rejectionReason` is optional even on reject — a staff
 * reviewer isn't forced to type one, though the notification sent to
 * the customer is more useful when they do.
 */
export class KycReviewDto {
  @IsIn(['verify', 'reject'])
  decision!: 'verify' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  rejectionReason?: string;
}
