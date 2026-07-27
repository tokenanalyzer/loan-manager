import type { ApprovalAction } from './approvals';
import type { UserRole } from './auth';

/** Mirrors the backend's `AccountStatus` enum (apps/backend/src/database/entities/enums.ts) — Team Management lifecycle state, Phase 3. */
export type AccountStatus = 'active' | 'disabled' | 'archived';

/** Mirrors the backend's StaffUserResponseDto (apps/backend/src/users/dto/staff-user-response.dto.ts). */
export interface StaffUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  status: AccountStatus;
  statusReason: string | null;
  statusChangedAt: string | null;
  activatedAt: string | null;
  invitedAt: string | null;
  lastLoginAt: string | null;
  lastFailedLoginAt: string | null;
  lastLoginIp: string | null;
  lastDevice: string | null;
  employeeCode: string | null;
  department: string | null;
  branch: string | null;
  /** A still-open maker-checker request against this account, if any (Phase 5) — mirrors the backend's `StaffUserResponseDto.pendingApproval`. */
  pendingApproval: { id: string; action: ApprovalAction; requestedAt: string } | null;
}

/** The list endpoint's response — use the shared `PaginatedResult<StaffUser>` from `./api-response`, not redefined here. */

/**
 * `POST /v1/users`'s response — mirrors the backend's
 * `CreateStaffUserResponseDto`. `inviteLink` is a one-time value: the
 * backend generates it fresh via Firebase and never persists it, so
 * this is the only place it's ever available. The Admin Panel must
 * surface a "Copy Invite Link" action immediately, since re-fetching
 * this user later (`GET /v1/users`) will not include it.
 */
export interface CreatedStaffUser extends StaffUser {
  inviteLink: string;
}

/** Mirrors the backend's CreateStaffUserDto. `role` is restricted to staff roles — this endpoint can never create a customer account. */
export interface CreateStaffUserPayload {
  email: string;
  fullName: string;
  role: Extract<UserRole, 'employee' | 'admin'>;
  employeeCode?: string;
  department?: string;
  branch?: string;
}

/** Mirrors the backend's StaffLifecycleReasonDto — the payload for both `PATCH /v1/users/:id/disable` and `.../archive`. Restore takes no body. */
export interface StaffLifecycleReasonPayload {
  reason: string;
}

/** Mirrors the backend's `STAFF_SORT_FIELDS` (apps/backend/src/users/user.repository.ts). */
export type StaffSortField = 'fullName' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt';

/** Mirrors the backend's `ListStaffQueryDto` — all optional, all additive to the pre-Phase-4 `GET /v1/users?page=&pageSize=` contract. */
export interface ListStaffQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: Extract<UserRole, 'employee' | 'admin'>;
  status?: AccountStatus;
  sortBy?: StaffSortField;
  sortDir?: 'asc' | 'desc';
}
