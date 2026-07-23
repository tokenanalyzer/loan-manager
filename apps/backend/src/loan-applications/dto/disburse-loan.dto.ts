import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * The disbursement itself (the actual bank transfer) happens outside
 * this system — this DTO records proof that it happened, not a
 * request to move money. `disbursementReference` is the bank's own
 * transaction id (UTR for NEFT/RTGS/IMPS), required so every disbursed
 * loan has real, auditable evidence behind it.
 */
export class DisburseLoanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  disbursementReference!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  remarks?: string;
}
