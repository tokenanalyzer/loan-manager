import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLogEntity, UserEntity, UserRole } from '../database/entities';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { EmployeeProfileRepository } from '../work-status/employee-profile.repository';

import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { PaginatedStaffUserResponseDto, StaffUserResponseDto } from './dto/staff-user-response.dto';
import { UserRepository } from './user.repository';

/**
 * Prefix identifying a not-yet-activated staff account's placeholder
 * `firebaseUid` — legacy marker from before staff provisioning created
 * a real Firebase user up front (see `AuthService`'s linking check).
 * `createStaffUser` no longer assigns this: every new staff row gets
 * its real Firebase UID immediately, at creation time. Kept only so
 * `AuthService`'s lazy-linking fallback still recognizes any row
 * created by the older flow.
 */
export const PENDING_STAFF_UID_PREFIX = 'pending-staff:';

export interface CreatedStaffUser {
  user: UserEntity;
  inviteLink: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly employeeProfileRepository: EmployeeProfileRepository,
    private readonly firebaseAdminService: FirebaseAdminService,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  /**
   * Orchestrates the full staff-provisioning workflow: create the
   * Firebase Authentication user, link its UID to a new `users` row,
   * and audit-log the action. The Firebase user is created first
   * (see `FirebaseAdminService.provisionStaffAccount`); if the
   * subsequent DB write fails for any reason, the just-created
   * Firebase user is rolled back (best effort) so a failed
   * provisioning attempt never leaves an orphaned Firebase identity
   * with no `users` row behind it. The invite link is returned to the
   * caller only — it is never persisted (requirement: the backend
   * never stores password-setup material).
   */
  async createStaffUser(dto: CreateStaffUserDto, actor: UserEntity): Promise<CreatedStaffUser> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const { firebaseUid, inviteLink } = await this.firebaseAdminService.provisionStaffAccount(
      email,
      dto.fullName,
    );

    let user: UserEntity;
    try {
      user = await this.userRepository.create({
        firebaseUid,
        email,
        fullName: dto.fullName,
        role: dto.role,
        isActive: true,
        invitedAt: new Date(),
        activatedAt: null,
      });

      if (dto.role === UserRole.EMPLOYEE) {
        // employeeCode is required by CreateStaffUserDto's @ValidateIf when role === EMPLOYEE.
        await this.employeeProfileRepository.create({
          userId: user.id,
          employeeCode: dto.employeeCode as string,
          department: dto.department ?? null,
          branch: dto.branch ?? null,
        });
      }
    } catch (error) {
      // The Firebase user was already created above; without this
      // rollback, a DB-side failure (e.g. a race on the email unique
      // constraint, or the employee-profile insert failing) would
      // leave a real Firebase identity with no corresponding `users`
      // row — unreachable by this UI and only cleanable by hand.
      await this.firebaseAdminService.deleteUser(firebaseUid);
      throw error;
    }

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        actorId: actor.id,
        action: 'staff_invited',
        entityName: 'users',
        entityId: user.id,
        metadata: { email, role: dto.role, firebaseUid },
      }),
    );

    const withProfile = await this.userRepository.findOneWithEmployeeProfile(user.id);
    return { user: withProfile ?? user, inviteLink };
  }

  async listStaff(page: number, pageSize: number): Promise<PaginatedStaffUserResponseDto> {
    const { items, total } = await this.userRepository.findStaffPaginated(page, pageSize);
    return {
      items: items.map((item) => StaffUserResponseDto.fromEntity(item)),
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }
}
