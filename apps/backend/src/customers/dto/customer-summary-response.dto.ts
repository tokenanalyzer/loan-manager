import { UserRole } from '../../database/entities';

/**
 * The CRM list/detail shape — identity fields only. Full profile
 * fields (address, income, etc.) are fetched separately via
 * `GET /v1/customers/:id/profile` — kept out of the list response so
 * listing customers doesn't require joining every profile row.
 */
export class CustomerSummaryResponseDto {
  id!: string;
  fullName!: string | null;
  email!: string | null;
  phone!: string | null;
  isActive!: boolean;

  static fromEntity(entity: {
    id: string;
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    role: UserRole;
    isActive: boolean;
  }): CustomerSummaryResponseDto {
    const dto = new CustomerSummaryResponseDto();
    dto.id = entity.id;
    dto.fullName = entity.fullName ?? null;
    dto.email = entity.email ?? null;
    dto.phone = entity.phone ?? null;
    dto.isActive = entity.isActive;
    return dto;
  }
}
