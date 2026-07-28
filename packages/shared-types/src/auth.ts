/**
 * Auth/identity domain types — mirrors the backend's `UserRole` enum
 * (`apps/backend/src/database/entities/enums.ts`) and
 * `UserProfileResponseDto` (`apps/backend/src/auth/dto`), consumed by
 * the web platform (Employee Portal / CRM / Super Admin) for
 * role-based routing.
 */

export type UserRole = 'customer' | 'employee' | 'manager' | 'org_admin' | 'admin';

/** The shape returned by `POST /v1/auth/session` and `GET /v1/auth/me`. */
export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
}

/** Settings → Profile self-edit payload for `PATCH /v1/auth/me`. */
export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
}
