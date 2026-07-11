import { UserRole } from '../../database/entities';

/**
 * UserProfileResponseDto — the shape returned by the auth session/me
 * endpoints. Deliberately minimal: identity + role only, no profile
 * (CustomerProfile/EmployeeProfile) fields — those belong to a later
 * phase's profile-management endpoints.
 */
export class UserProfileResponseDto {
  id!: string;
  firebaseUid!: string;
  email!: string | null;
  fullName!: string | null;
  role!: UserRole;
  isActive!: boolean;

  static fromEntity(entity: {
    id: string;
    firebaseUid: string;
    email?: string | null;
    fullName?: string | null;
    role: UserRole;
    isActive: boolean;
  }): UserProfileResponseDto {
    const dto = new UserProfileResponseDto();
    dto.id = entity.id;
    dto.firebaseUid = entity.firebaseUid;
    dto.email = entity.email ?? null;
    dto.fullName = entity.fullName ?? null;
    dto.role = entity.role;
    dto.isActive = entity.isActive;
    return dto;
  }
}
