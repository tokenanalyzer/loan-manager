import { UserRole } from '../../database/entities';

/** Read-only employee-specific fields, only ever populated for an EMPLOYEE caller. */
export interface EmployeeProfileFieldsDto {
  employeeCode: string;
  department: string | null;
  branch: string | null;
  hireDate: string | null;
}

/**
 * UserProfileResponseDto — the shape returned by the auth session/me
 * endpoints. Deliberately minimal: identity + role, plus (Employee CRM
 * sub-phase 5) the caller's own read-only `employeeProfile` fields when
 * they're an EMPLOYEE — CustomerProfile fields still aren't surfaced
 * here, that remains later-phase scope.
 */
export class UserProfileResponseDto {
  id!: string;
  firebaseUid!: string;
  email!: string | null;
  phone!: string | null;
  fullName!: string | null;
  photoUrl!: string | null;
  role!: UserRole;
  isActive!: boolean;
  employeeProfile?: EmployeeProfileFieldsDto;

  static fromEntity(
    entity: {
      id: string;
      firebaseUid: string;
      email?: string | null;
      phone?: string | null;
      fullName?: string | null;
      photoUrl?: string | null;
      role: UserRole;
      isActive: boolean;
    },
    employeeProfile?: {
      employeeCode: string;
      department?: string | null;
      branch?: string | null;
      hireDate?: string | null;
    } | null,
  ): UserProfileResponseDto {
    const dto = new UserProfileResponseDto();
    dto.id = entity.id;
    dto.firebaseUid = entity.firebaseUid;
    dto.email = entity.email ?? null;
    dto.phone = entity.phone ?? null;
    dto.fullName = entity.fullName ?? null;
    dto.photoUrl = entity.photoUrl ?? null;
    dto.role = entity.role;
    dto.isActive = entity.isActive;
    if (employeeProfile) {
      dto.employeeProfile = {
        employeeCode: employeeProfile.employeeCode,
        department: employeeProfile.department ?? null,
        branch: employeeProfile.branch ?? null,
        hireDate: employeeProfile.hireDate ?? null,
      };
    }
    return dto;
  }
}
