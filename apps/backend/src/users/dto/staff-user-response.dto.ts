import { UserRole } from '../../database/entities';

export class StaffUserResponseDto {
  id!: string;
  email!: string | null;
  fullName!: string | null;
  role!: UserRole;
  isActive!: boolean;
  /** Null means the invite hasn't been accepted yet (no first sign-in). */
  activatedAt!: Date | null;
  invitedAt!: Date | null;
  employeeCode!: string | null;
  department!: string | null;
  branch!: string | null;

  static fromEntity(entity: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    role: UserRole;
    isActive: boolean;
    activatedAt?: Date | null;
    invitedAt?: Date | null;
    employeeProfile?: { employeeCode: string; department?: string | null; branch?: string | null } | null;
  }): StaffUserResponseDto {
    const dto = new StaffUserResponseDto();
    dto.id = entity.id;
    dto.email = entity.email ?? null;
    dto.fullName = entity.fullName ?? null;
    dto.role = entity.role;
    dto.isActive = entity.isActive;
    dto.activatedAt = entity.activatedAt ?? null;
    dto.invitedAt = entity.invitedAt ?? null;
    dto.employeeCode = entity.employeeProfile?.employeeCode ?? null;
    dto.department = entity.employeeProfile?.department ?? null;
    dto.branch = entity.employeeProfile?.branch ?? null;
    return dto;
  }
}

/**
 * Mirrors `PaginatedResult<T>`/`PaginationMeta` in
 * `packages/shared-types/src/api-response.ts` field-for-field (same
 * convention as every other backend response DTO vs. its shared-types
 * counterpart in this codebase — kept in sync by matching shape, not
 * by a cross-package import; the backend doesn't depend on
 * `@loan-manager/shared-types` today and this module doesn't
 * introduce that dependency).
 */
export class PaginatedStaffUserResponseDto {
  items!: StaffUserResponseDto[];
  meta!: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
