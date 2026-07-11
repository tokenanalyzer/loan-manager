export class CustomerProfileResponseDto {
  userId!: string;
  dateOfBirth!: string | null;
  nationalIdNumber!: string | null;
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

  static fromEntity(entity: {
    userId: string;
    dateOfBirth?: string | null;
    nationalIdNumber?: string | null;
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
  }): CustomerProfileResponseDto {
    const dto = new CustomerProfileResponseDto();
    dto.userId = entity.userId;
    dto.dateOfBirth = entity.dateOfBirth ?? null;
    dto.nationalIdNumber = entity.nationalIdNumber ?? null;
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
    return dto;
  }
}
