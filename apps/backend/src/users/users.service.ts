import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountStatus, AuditLogEntity, UserEntity, UserRole } from '../database/entities';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import { EmployeeProfileRepository } from '../work-status/employee-profile.repository';

import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
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
    private readonly loanApplicationRepository: LoanApplicationRepository,
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

  /**
   * Phase 4 additive: `query.search`/`role`/`status`/`sortBy`/`sortDir`
   * all default to exactly what this endpoint already did (no filter,
   * newest-first) — an existing caller that omits them sees identical
   * results and pagination shape.
   */
  async listStaff(query: ListStaffQueryDto): Promise<PaginatedStaffUserResponseDto> {
    const { items, total } = await this.userRepository.findStaffPaginated({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      role: query.role,
      status: query.status,
      sortBy: query.sortBy,
      sortDir: query.sortDir.toUpperCase() as 'ASC' | 'DESC',
    });
    return {
      items: items.map((item) => StaffUserResponseDto.fromEntity(item)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  /**
   * Disable — reversible, short/medium-term suspension. Requires a
   * reason, revokes existing Firebase sessions immediately, and is
   * blocked for a self-action or if it would leave zero active Super
   * Admins. See `AccountStatus`'s doc comment for how this differs
   * from Archive.
   */
  async disableStaffUser(targetId: string, reason: string, actor: UserEntity): Promise<StaffUserResponseDto> {
    const target = await this.getStaffOrThrow(targetId);
    this.assertNotSelf(targetId, actor, 'disable');

    if (target.status !== AccountStatus.ACTIVE) {
      throw new ConflictException(`This account is already ${target.status}.`);
    }
    await this.assertNotLastActiveSuperAdmin(target, 'disabled');

    const fromStatus = target.status;
    await this.applyStatusTransition(target, AccountStatus.DISABLED, reason, actor);
    await this.firebaseAdminService.revokeSessions(target.firebaseUid);
    await this.writeLifecycleAudit('staff_disabled', target, actor, reason, fromStatus, AccountStatus.DISABLED);

    return this.getResponseDto(targetId);
  }

  /**
   * Archive — a superset of Disable (also revokes sessions), for
   * someone who has actually left. Requires a reason, is blocked for a
   * self-action or the last active Super Admin, and — for an
   * EMPLOYEE — is blocked while they still have active leads assigned
   * (see `LoanApplicationRepository.findActiveAssignedTo`); reassign
   * those first via Lead Assignment's transfer-all, then archive.
   * Reachable directly from ACTIVE or DISABLED.
   */
  async archiveStaffUser(targetId: string, reason: string, actor: UserEntity): Promise<StaffUserResponseDto> {
    const target = await this.getStaffOrThrow(targetId);
    this.assertNotSelf(targetId, actor, 'archive');

    if (target.status === AccountStatus.ARCHIVED) {
      throw new ConflictException('This account is already archived.');
    }
    await this.assertNotLastActiveSuperAdmin(target, 'archived');

    if (target.role === UserRole.EMPLOYEE) {
      const activeLeads = await this.loanApplicationRepository.findActiveAssignedTo(target.id);
      if (activeLeads.length > 0) {
        throw new ConflictException(
          `Cannot archive: this employee still has ${activeLeads.length} active lead(s) assigned. ` +
            'Reassign them first (Lead Assignment — Transfer All), then archive.',
        );
      }
    }

    const fromStatus = target.status;
    await this.applyStatusTransition(target, AccountStatus.ARCHIVED, reason, actor);
    await this.firebaseAdminService.revokeSessions(target.firebaseUid);
    await this.writeLifecycleAudit('staff_archived', target, actor, reason, fromStatus, AccountStatus.ARCHIVED);

    return this.getResponseDto(targetId);
  }

  /**
   * Restore — reverses Disable or Archive back to Active. No reason
   * required (nothing in the approved design mandates one), no
   * self-action guard (a disabled/archived account has no valid
   * session to call this with anyway), no session revocation (there's
   * nothing to revoke on the way back in).
   */
  async restoreStaffUser(targetId: string, actor: UserEntity): Promise<StaffUserResponseDto> {
    const target = await this.getStaffOrThrow(targetId);

    if (target.status === AccountStatus.ACTIVE) {
      throw new ConflictException('This account is already active.');
    }

    const fromStatus = target.status;
    await this.applyStatusTransition(target, AccountStatus.ACTIVE, null, actor);
    await this.writeLifecycleAudit('staff_restored', target, actor, null, fromStatus, AccountStatus.ACTIVE);

    return this.getResponseDto(targetId);
  }

  /**
   * Phase 4 — "Resend Invite" (an ACTIVE-status account that has never
   * signed in) and "Password Reset" (one that has) are the same
   * underlying action: generate a fresh Firebase password-setup link.
   * One method covers both; the caller (Admin Panel) picks the label
   * from `activatedAt`. Blocked for a disabled/archived target — a new
   * link would be useless (sign-in is blocked regardless) and
   * generating one would be misleading. The link is returned only in
   * the response, never persisted — same rule as `createStaffUser`'s
   * invite link.
   */
  async resendInviteOrResetPassword(targetId: string, actor: UserEntity): Promise<CreatedStaffUser> {
    const target = await this.getStaffOrThrow(targetId);

    if (target.status !== AccountStatus.ACTIVE) {
      throw new ConflictException(
        `Cannot send a password-setup link: this account is ${target.status}, not active.`,
      );
    }
    if (!target.email) {
      throw new ConflictException('This account has no email on file.');
    }

    const inviteLink = await this.firebaseAdminService.generatePasswordSetupLink(target.email);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        actorId: actor.id,
        action: target.activatedAt ? 'staff_password_reset' : 'staff_invite_resent',
        entityName: 'users',
        entityId: target.id,
        metadata: { email: target.email },
      }),
    );

    const withProfile = await this.userRepository.findOneWithEmployeeProfile(target.id);
    return { user: withProfile ?? target, inviteLink };
  }

  private async getStaffOrThrow(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOneById(id);
    if (!user || user.role === UserRole.CUSTOMER) {
      throw new NotFoundException('Staff account not found.');
    }
    return user;
  }

  private assertNotSelf(targetId: string, actor: UserEntity, action: 'disable' | 'archive'): void {
    if (targetId === actor.id) {
      throw new BadRequestException(`You cannot ${action} your own account.`);
    }
  }

  /**
   * Only Super Admin (`ADMIN`) accounts are gated — Manager/Employee/
   * Org Admin deactivation can never lock the organization out of its
   * own admin tooling. Already-inactive targets don't reduce the
   * active count further, so they're exempt too.
   */
  private async assertNotLastActiveSuperAdmin(target: UserEntity, verb: 'disabled' | 'archived'): Promise<void> {
    if (target.role !== UserRole.ADMIN || target.status !== AccountStatus.ACTIVE) {
      return;
    }
    const otherActiveAdmins = await this.userRepository.countActiveByRole(UserRole.ADMIN, target.id);
    if (otherActiveAdmins === 0) {
      throw new ConflictException(`This account cannot be ${verb}: it is the last active Super Admin.`);
    }
  }

  private async applyStatusTransition(
    target: UserEntity,
    toStatus: AccountStatus,
    reason: string | null,
    actor: UserEntity,
  ): Promise<void> {
    await this.userRepository.update(target.id, {
      status: toStatus,
      statusReason: reason,
      statusChangedAt: new Date(),
      statusChangedById: actor.id,
      // Kept in lockstep with `status` — see AccountStatus's doc
      // comment on why `isActive` still exists and is what
      // SyncUserGuard actually enforces.
      isActive: toStatus === AccountStatus.ACTIVE,
    });
  }

  /** One immutable row per transition — never overwritten, never reused across transitions. */
  private async writeLifecycleAudit(
    action: string,
    target: UserEntity,
    actor: UserEntity,
    reason: string | null,
    fromStatus: AccountStatus,
    toStatus: AccountStatus,
  ): Promise<void> {
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        actorId: actor.id,
        action,
        entityName: 'users',
        entityId: target.id,
        metadata: { reason, fromStatus, toStatus },
      }),
    );
  }

  private async getResponseDto(id: string): Promise<StaffUserResponseDto> {
    const updated = await this.userRepository.findOneWithEmployeeProfile(id);
    if (!updated) {
      throw new NotFoundException('Staff account not found after update.');
    }
    return StaffUserResponseDto.fromEntity(updated);
  }
}
