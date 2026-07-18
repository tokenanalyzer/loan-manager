import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { PinoLogger } from 'nestjs-pino';
import { DataSource, Repository } from 'typeorm';

import {
  AuditLogEntity,
  BreakEndReason,
  EmployeeBreakEntity,
  EmployeeProfileEntity,
  UserEntity,
  UserRole,
  WorkStatus,
} from '../database/entities';
import { FIREBASE_ADMIN_APP } from '../firebase/firebase-admin.provider';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRepository } from '../users/user.repository';

import { EmployeeStatusSummaryResponseDto } from './dto/employee-status-summary-response.dto';
import { MyWorkStatusResponseDto } from './dto/my-work-status-response.dto';
import { EmployeeBreakRepository } from './employee-break.repository';
import { EmployeeProfileRepository } from './employee-profile.repository';

/**
 * WorkStatusService — Employee Work Status & Break Management.
 *
 * An employee's own status (`GET/PATCH .../me`, break start/end) is
 * self-service. Everything else — ending/force-resuming someone
 * else's break, force logout, disable — is the Admin Override half:
 * `LeadAssignmentController`-style, admin-only, always audit-logged.
 *
 * Force Logout / Disable reuse the existing Firebase session system
 * (`revokeRefreshTokens` + `FirebaseAuthGuard`'s `checkRevoked: true`)
 * rather than inventing a parallel session store. Token revocation is
 * best-effort (fast-path immediate kill) — `SyncUserGuard`'s
 * `isActive` check is the authoritative enforcement for Disable, so a
 * transient Firebase error here never leaves a disabled/force-logged-
 * out account still usable.
 */
@Injectable()
export class WorkStatusService {
  constructor(
    private readonly employeeProfileRepository: EmployeeProfileRepository,
    private readonly employeeBreakRepository: EmployeeBreakRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(AuditLogEntity) private readonly auditLogRepository: Repository<AuditLogEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(FIREBASE_ADMIN_APP) private readonly firebaseApp: App | null,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WorkStatusService.name);
  }

  async getMyStatus(user: UserEntity): Promise<MyWorkStatusResponseDto> {
    const profile = await this.getOwnProfileOrThrow(user.id);
    return MyWorkStatusResponseDto.fromEntity(profile);
  }

  async startBreak(user: UserEntity, breakType: WorkStatus): Promise<MyWorkStatusResponseDto> {
    await this.getOwnProfileOrThrow(user.id);

    const active = await this.employeeBreakRepository.findActiveBreak(user.id);
    if (active) {
      throw new ConflictException('You are already on a break.');
    }

    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      await manager.save(
        manager.create(EmployeeBreakEntity, {
          employeeId: user.id,
          breakType,
          startedAt: now,
        }),
      );
      await manager.update(EmployeeProfileEntity, { userId: user.id }, {
        currentStatus: breakType,
        currentStatusSince: now,
      });
    });

    return MyWorkStatusResponseDto.fromEntity({ currentStatus: breakType, currentStatusSince: now });
  }

  async endBreak(user: UserEntity): Promise<MyWorkStatusResponseDto> {
    const active = await this.employeeBreakRepository.findActiveBreak(user.id);
    if (!active) {
      throw new ConflictException('You are not currently on a break.');
    }

    const now = new Date();
    await this.closeBreak(active, now, BreakEndReason.EMPLOYEE_ENDED, null);

    return MyWorkStatusResponseDto.fromEntity({
      currentStatus: WorkStatus.ONLINE,
      currentStatusSince: now,
    });
  }

  async setStatus(user: UserEntity, status: WorkStatus): Promise<MyWorkStatusResponseDto> {
    const active = await this.employeeBreakRepository.findActiveBreak(user.id);
    if (active) {
      throw new ConflictException('End your break before changing status.');
    }

    const now = new Date();
    await this.employeeProfileRepository.updateStatusByUserId(user.id, status, now);
    return MyWorkStatusResponseDto.fromEntity({ currentStatus: status, currentStatusSince: now });
  }

  async getAllEmployeeStatuses(): Promise<EmployeeStatusSummaryResponseDto[]> {
    const employees = await this.userRepository.findAllByRoleWithEmployeeProfile(UserRole.EMPLOYEE);
    return employees.map((employee) => EmployeeStatusSummaryResponseDto.fromEntity(employee));
  }

  /** Admin ends/force-resumes an employee's break — see EndBreakDto for the `forceResume` distinction. */
  async adminEndBreak(
    employeeId: string,
    admin: UserEntity,
    forceResume: boolean,
  ): Promise<EmployeeStatusSummaryResponseDto> {
    const active = await this.employeeBreakRepository.findActiveBreak(employeeId);
    if (!active) {
      throw new ConflictException('This employee is not currently on a break.');
    }

    const now = new Date();
    const reason = forceResume ? BreakEndReason.ADMIN_FORCE_RESUMED : BreakEndReason.ADMIN_ENDED;
    await this.closeBreak(active, now, reason, admin.id);

    if (forceResume) {
      await this.notificationsService.createForUser({
        userId: employeeId,
        title: 'Break ended by administrator',
        body: 'Your break has been ended by the administrator. Please resume your work.',
        relatedEntityType: 'employee_break',
        relatedEntityId: active.id,
      });
    }

    const employee = await this.userRepository.findOneWithEmployeeProfile(employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found after update.');
    }
    return EmployeeStatusSummaryResponseDto.fromEntity(employee);
  }

  async forceLogout(employeeId: string, admin: UserEntity): Promise<void> {
    const employee = await this.getEmployeeOrThrow(employeeId);
    await this.revokeSessions(employee.firebaseUid);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        actorId: admin.id,
        action: 'force_logout',
        entityName: 'users',
        entityId: employeeId,
      }),
    );
  }

  async disableEmployee(employeeId: string, admin: UserEntity): Promise<void> {
    const employee = await this.getEmployeeOrThrow(employeeId);
    await this.userRepository.update(employeeId, { isActive: false });
    await this.revokeSessions(employee.firebaseUid);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        actorId: admin.id,
        action: 'disable_employee',
        entityName: 'users',
        entityId: employeeId,
      }),
    );
  }

  private async closeBreak(
    active: EmployeeBreakEntity,
    endedAt: Date,
    endReason: BreakEndReason,
    endedByAdminId: string | null,
  ): Promise<void> {
    const durationSeconds = Math.max(
      0,
      Math.floor((endedAt.getTime() - active.startedAt.getTime()) / 1000),
    );

    await this.dataSource.transaction(async (manager) => {
      await manager.update(EmployeeBreakEntity, active.id, {
        endedAt,
        endReason,
        endedByAdminId,
        durationSeconds,
      });
      await manager.update(EmployeeProfileEntity, { userId: active.employeeId }, {
        currentStatus: WorkStatus.ONLINE,
        currentStatusSince: endedAt,
      });
    });
  }

  private async getOwnProfileOrThrow(userId: string): Promise<EmployeeProfileEntity> {
    const profile = await this.employeeProfileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Employee profile not found.');
    }
    return profile;
  }

  private async getEmployeeOrThrow(employeeId: string): Promise<UserEntity> {
    const employee = await this.userRepository.findOneById(employeeId);
    if (!employee || employee.role !== UserRole.EMPLOYEE) {
      throw new NotFoundException('Employee not found.');
    }
    return employee;
  }

  /**
   * Best-effort — swallows failures (e.g. the Firebase user doesn't
   * exist, network error) so Force Logout/Disable's DB-side effect
   * (audit log, `isActive`) never gets rolled back by a session-kill
   * side-channel failing. `SyncUserGuard` enforces `isActive` on every
   * request regardless of whether this succeeds.
   */
  private async revokeSessions(firebaseUid: string): Promise<void> {
    if (!this.firebaseApp) {
      return; // Firebase not configured in this environment — consistent no-op with FirebaseAuthGuard.
    }
    try {
      await getAuth(this.firebaseApp).revokeRefreshTokens(firebaseUid);
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to revoke Firebase sessions — proceeding anyway.');
    }
  }
}
