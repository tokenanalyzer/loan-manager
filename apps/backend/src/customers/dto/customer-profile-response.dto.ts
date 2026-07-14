import { KycStatus } from '../../database/entities';

export class CustomerProfileResponseDto {
  userId!: string;
  dateOfBirth!: string | null;
  panNumber!: string | null;
  aadhaarLast4!: string | null;
  kycStatus!: KycStatus;
  kycRejectionReason!: string | null;
  addressLine1!: string | null;
  addressLine2!: string | null;
  city!: string | null;
  state!: string | null;
  postalCode!: string | null;
  country!: string | null;
  employmentStatus!: string | null;
  monthlyIncome!: string | null;
  marketingConsent!: boolean;
  dataConsentAcceptedAt!: Date | null;

  /**
   * Masked for display (last 4 digits) — the full number is stored
   * (unlike Aadhaar, disbursement genuinely needs it) but never sent
   * back over the wire; re-entering it via `UpdateCustomerProfileDto.
   * bankAccountNumber` (write-only) is how a customer corrects it.
   */
  bankAccountLast4!: string | null;
  bankIfscCode!: string | null;
  bankAccountHolderName!: string | null;
  nomineeName!: string | null;
  nomineeRelationship!: string | null;

  static fromEntity(entity: {
    userId: string;
    dateOfBirth?: string | null;
    panNumber?: string | null;
    aadhaarLast4?: string | null;
    kycStatus?: KycStatus;
    kycRejectionReason?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    employmentStatus?: string | null;
    monthlyIncome?: string | null;
    marketingConsent?: boolean;
    dataConsentAcceptedAt?: Date | null;
    bankAccountNumber?: string | null;
    bankIfscCode?: string | null;
    bankAccountHolderName?: string | null;
    nomineeName?: string | null;
    nomineeRelationship?: string | null;
  }): CustomerProfileResponseDto {
    const dto = new CustomerProfileResponseDto();
    dto.userId = entity.userId;
    dto.dateOfBirth = entity.dateOfBirth ?? null;
    dto.panNumber = entity.panNumber ?? null;
    dto.aadhaarLast4 = entity.aadhaarLast4 ?? null;
    dto.kycStatus = entity.kycStatus ?? KycStatus.NOT_SUBMITTED;
    dto.kycRejectionReason = entity.kycRejectionReason ?? null;
    dto.addressLine1 = entity.addressLine1 ?? null;
    dto.addressLine2 = entity.addressLine2 ?? null;
    dto.city = entity.city ?? null;
    dto.state = entity.state ?? null;
    dto.postalCode = entity.postalCode ?? null;
    dto.country = entity.country ?? null;
    dto.employmentStatus = entity.employmentStatus ?? null;
    dto.monthlyIncome = entity.monthlyIncome ?? null;
    dto.marketingConsent = entity.marketingConsent ?? false;
    dto.dataConsentAcceptedAt = entity.dataConsentAcceptedAt ?? null;
    dto.bankAccountLast4 = entity.bankAccountNumber
      ? entity.bankAccountNumber.slice(-4)
      : null;
    dto.bankIfscCode = entity.bankIfscCode ?? null;
    dto.bankAccountHolderName = entity.bankAccountHolderName ?? null;
    dto.nomineeName = entity.nomineeName ?? null;
    dto.nomineeRelationship = entity.nomineeRelationship ?? null;
    return dto;
  }
}
