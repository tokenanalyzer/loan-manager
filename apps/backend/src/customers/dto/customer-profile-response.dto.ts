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
  nomineePhone!: string | null;

  // --- Full application-form fields (Phase 1) ---
  gender!: string | null;
  maritalStatus!: string | null;
  fatherName!: string | null;
  motherName!: string | null;
  residenceType!: string | null;
  yearsAtCurrentAddress!: number | null;
  permanentAddress!: string | null;
  companyName!: string | null;
  designation!: string | null;
  joiningDate!: string | null;
  officeAddress!: string | null;
  officePhone!: string | null;
  additionalIncome!: string | null;
  currentMonthlyEmi!: string | null;
  creditCardCount!: number | null;
  creditCardOutstanding!: string | null;
  existingLoansOutstanding!: string | null;
  reference1Name!: string | null;
  reference1Phone!: string | null;
  reference1Relationship!: string | null;
  reference2Name!: string | null;
  reference2Phone!: string | null;
  reference2Relationship!: string | null;

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
    nomineePhone?: string | null;
    gender?: string | null;
    maritalStatus?: string | null;
    fatherName?: string | null;
    motherName?: string | null;
    residenceType?: string | null;
    yearsAtCurrentAddress?: number | null;
    permanentAddress?: string | null;
    companyName?: string | null;
    designation?: string | null;
    joiningDate?: string | null;
    officeAddress?: string | null;
    officePhone?: string | null;
    additionalIncome?: string | null;
    currentMonthlyEmi?: string | null;
    creditCardCount?: number | null;
    creditCardOutstanding?: string | null;
    existingLoansOutstanding?: string | null;
    reference1Name?: string | null;
    reference1Phone?: string | null;
    reference1Relationship?: string | null;
    reference2Name?: string | null;
    reference2Phone?: string | null;
    reference2Relationship?: string | null;
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
    dto.bankAccountLast4 = entity.bankAccountNumber ? entity.bankAccountNumber.slice(-4) : null;
    dto.bankIfscCode = entity.bankIfscCode ?? null;
    dto.bankAccountHolderName = entity.bankAccountHolderName ?? null;
    dto.nomineeName = entity.nomineeName ?? null;
    dto.nomineeRelationship = entity.nomineeRelationship ?? null;
    dto.nomineePhone = entity.nomineePhone ?? null;
    dto.gender = entity.gender ?? null;
    dto.maritalStatus = entity.maritalStatus ?? null;
    dto.fatherName = entity.fatherName ?? null;
    dto.motherName = entity.motherName ?? null;
    dto.residenceType = entity.residenceType ?? null;
    dto.yearsAtCurrentAddress = entity.yearsAtCurrentAddress ?? null;
    dto.permanentAddress = entity.permanentAddress ?? null;
    dto.companyName = entity.companyName ?? null;
    dto.designation = entity.designation ?? null;
    dto.joiningDate = entity.joiningDate ?? null;
    dto.officeAddress = entity.officeAddress ?? null;
    dto.officePhone = entity.officePhone ?? null;
    dto.additionalIncome = entity.additionalIncome ?? null;
    dto.currentMonthlyEmi = entity.currentMonthlyEmi ?? null;
    dto.creditCardCount = entity.creditCardCount ?? null;
    dto.creditCardOutstanding = entity.creditCardOutstanding ?? null;
    dto.existingLoansOutstanding = entity.existingLoansOutstanding ?? null;
    dto.reference1Name = entity.reference1Name ?? null;
    dto.reference1Phone = entity.reference1Phone ?? null;
    dto.reference1Relationship = entity.reference1Relationship ?? null;
    dto.reference2Name = entity.reference2Name ?? null;
    dto.reference2Phone = entity.reference2Phone ?? null;
    dto.reference2Relationship = entity.reference2Relationship ?? null;
    return dto;
  }
}
