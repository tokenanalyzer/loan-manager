import { AccountStatus, UserRole } from '../../database/entities';

export class StaffUserResponseDto {
  id!: string;
  email!: string | null;
  fullName!: string | null;
  role!: UserRole;
  isActive!: boolean;
  /** When this row was created — powers the Team screen's "Added" sort column (Phase 4). */
  createdAt!: Date;
  status!: AccountStatus;
  /** Non-null only while status is DISABLED/ARCHIVED — the reason captured at that transition. Cleared on Restore. */
  statusReason!: string | null;
  statusChangedAt!: Date | null;
  /** Null means the invite hasn't been accepted yet (no first sign-in). */
  activatedAt!: Date | null;
  invitedAt!: Date | null;
  lastLoginAt!: Date | null;
  lastFailedLoginAt!: Date | null;
  lastLoginIp!: string | null;
  lastDevice!: string | null;
  employeeCode!: string | null;
  department!: string | null;
  branch!: string | null;
  /** Set only by `UsersService.listStaff` (Phase 5) — a still-open maker-checker request against this account, if any. Never derived from `UserEntity` itself. */
  pendingApproval!: { id: string; action: string; requestedAt: Date } | null;

  static fromEntity(entity: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    status: AccountStatus;
    statusReason?: string | null;
    statusChangedAt?: Date | null;
    activatedAt?: Date | null;
    invitedAt?: Date | null;
    lastLoginAt?: Date | null;
    lastFailedLoginAt?: Date | null;
    lastLoginIp?: string | null;
    lastDevice?: string | null;
    employeeProfile?: { employeeCode: string; department?: string | null; branch?: string | null } | null;
  }): StaffUserResponseDto {
    const dto = new StaffUserResponseDto();
    dto.id = entity.id;
    dto.email = entity.email ?? null;
    dto.fullName = entity.fullName ?? null;
    dto.role = entity.role;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.status = entity.status;
    dto.statusReason = entity.statusReason ?? null;
    dto.statusChangedAt = entity.statusChangedAt ?? null;
    dto.activatedAt = entity.activatedAt ?? null;
    dto.invitedAt = entity.invitedAt ?? null;
    dto.lastLoginAt = entity.lastLoginAt ?? null;
    dto.lastFailedLoginAt = entity.lastFailedLoginAt ?? null;
    dto.lastLoginIp = entity.lastLoginIp ?? null;
    dto.lastDevice = entity.lastDevice ?? null;
    dto.employeeCode = entity.employeeProfile?.employeeCode ?? null;
    dto.department = entity.employeeProfile?.department ?? null;
    dto.branch = entity.employeeProfile?.branch ?? null;
    dto.pendingApproval = null;
    return dto;
  }
}

/**
 * Returned from `POST /v1/users` (account creation) and
 * `POST /v1/users/:id/reset-password` (Phase 4 — Resend Invite /
 * Password Reset) — the one thing both have in common is a
 * freshly-Firebase-generated password-setup link, deliberately never
 * persisted (see `UsersService.createStaffUser` /
 * `resendInviteOrResetPassword`), so there is no way to re-fetch it
 * later; the Admin Panel's "Copy Invite Link" action is the only
 * chance to grab it each time.
 */
export class CreateStaffUserResponseDto extends StaffUserResponseDto {
  inviteLink!: string;

  static fromCreated(
    entity: Parameters<typeof StaffUserResponseDto.fromEntity>[0],
    inviteLink: string,
  ): CreateStaffUserResponseDto {
    const base = StaffUserResponseDto.fromEntity(entity);
    const dto = new CreateStaffUserResponseDto();
    Object.assign(dto, base);
    dto.inviteLink = inviteLink;
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
