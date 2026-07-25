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

/** Mirrors the backend's CreateStaffUserDto. `role` is restricted to staff roles — this endpoint can never create a customer account. */
export interface CreateStaffUserPayload {
  email: string;
  fullName: string;
  role: Extract<UserRole, 'employee' | 'admin'>;
  employeeCode?: string;
  department?: string;
  branch?: string;
}
