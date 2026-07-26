import type { UserRole } from './auth';

/** Mirrors the backend's StaffUserResponseDto (apps/backend/src/users/dto/staff-user-response.dto.ts). */
export interface StaffUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  activatedAt: string | null;
  invitedAt: string | null;
  employeeCode: string | null;
  department: string | null;
  branch: string | null;
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
