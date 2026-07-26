import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { AccountStatus, AuditLogEntity, UserRole } from '../database/entities';
import type { FirebaseAdminService } from '../firebase/firebase-admin.service';
import type { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import type { EmployeeProfileRepository } from '../work-status/employee-profile.repository';

import type { CreateStaffUserDto } from './dto/create-staff-user.dto';
import type { UserRepository } from './user.repository';
import { UsersService } from './users.service';

/**
 * Covers the Phase 2 orchestration added to `createStaffUser`:
 * Firebase-first creation, DB linking, audit logging, and rollback of
 * the just-created Firebase user when the DB write that should follow
 * it fails. `listStaff` is unchanged from Module 1 and not re-tested
 * here.
 */
describe('UsersService — createStaffUser (Firebase-orchestrated provisioning)', () => {
  const actor = { id: 'admin-1', role: UserRole.ADMIN } as never;

  function buildDto(overrides: Partial<CreateStaffUserDto> = {}): CreateStaffUserDto {
    return {
      email: 'New.Staff@Example.com',
      fullName: 'New Staff',
      role: UserRole.EMPLOYEE,
      employeeCode: 'EMP-0001',
      ...overrides,
    } as CreateStaffUserDto;
  }

  /** Default target row for the Phase 3 lifecycle tests below — an active Employee. */
  function buildTarget(overrides: Record<string, unknown> = {}) {
    return {
      id: 'target-1',
      role: UserRole.EMPLOYEE,
      status: AccountStatus.ACTIVE,
      firebaseUid: 'target-firebase-uid',
      ...overrides,
    };
  }

  function buildHarness(options: { target?: ReturnType<typeof buildTarget> | null } = {}) {
    const target = options.target === undefined ? buildTarget() : options.target;

    const findByEmail = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockImplementation((data) => Promise.resolve({ id: 'new-user', ...data }));
    const findOneWithEmployeeProfile = jest
      .fn()
      .mockImplementation((id) => Promise.resolve({ id, employeeProfile: null, ...target }));
    const findOneById = jest.fn().mockResolvedValue(target);
    const update = jest.fn().mockImplementation((id, patch) => Promise.resolve({ ...target, id, ...patch }));
    const countActiveByRole = jest.fn().mockResolvedValue(1);
    const userRepository = {
      findByEmail,
      create,
      findOneWithEmployeeProfile,
      findOneById,
      update,
      countActiveByRole,
    } as unknown as UserRepository;

    const employeeProfileCreate = jest.fn().mockResolvedValue(undefined);
    const employeeProfileRepository = {
      create: employeeProfileCreate,
    } as unknown as EmployeeProfileRepository;

    const provisionStaffAccount = jest
      .fn()
      .mockResolvedValue({ firebaseUid: 'firebase-uid-1', inviteLink: 'https://example.com/invite' });
    const deleteUser = jest.fn().mockResolvedValue(undefined);
    const revokeSessions = jest.fn().mockResolvedValue(undefined);
    const generatePasswordSetupLink = jest.fn().mockResolvedValue('https://example.com/reset');
    const firebaseAdminService = {
      provisionStaffAccount,
      deleteUser,
      revokeSessions,
      generatePasswordSetupLink,
    } as unknown as FirebaseAdminService;

    const findActiveAssignedTo = jest.fn().mockResolvedValue([]);
    const loanApplicationRepository = {
      findActiveAssignedTo,
    } as unknown as LoanApplicationRepository;

    const auditLogCreate = jest.fn().mockImplementation((data) => data);
    const auditLogSave = jest.fn().mockResolvedValue(undefined);
    const auditLogRepository = {
      create: auditLogCreate,
      save: auditLogSave,
    } as unknown as Repository<AuditLogEntity>;

    const service = new UsersService(
      userRepository,
      employeeProfileRepository,
      firebaseAdminService,
      loanApplicationRepository,
      auditLogRepository,
    );

    return {
      service,
      findByEmail,
      create,
      findOneById,
      update,
      countActiveByRole,
      employeeProfileCreate,
      provisionStaffAccount,
      deleteUser,
      revokeSessions,
      findActiveAssignedTo,
      auditLogCreate,
      auditLogSave,
    };
  }

  it('creates the Firebase user first, links its real UID on the users row, and audit-logs the action', async () => {
    const { service, create, provisionStaffAccount, auditLogSave, auditLogCreate } = buildHarness();

    const result = await service.createStaffUser(buildDto(), actor);

    expect(provisionStaffAccount).toHaveBeenCalledWith('new.staff@example.com', 'New Staff');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ firebaseUid: 'firebase-uid-1', email: 'new.staff@example.com' }),
    );
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'staff_invited',
        entityName: 'users',
        metadata: expect.objectContaining({ firebaseUid: 'firebase-uid-1' }),
      }),
    );
    expect(auditLogSave).toHaveBeenCalled();
    expect(result.inviteLink).toBe('https://example.com/invite');
  });

  it('never stores the invite link on the users row', async () => {
    const { service, create } = buildHarness();

    await service.createStaffUser(buildDto(), actor);

    const createCallArg = create.mock.calls[0][0];
    expect(createCallArg.inviteLink).toBeUndefined();
  });

  it('rejects a duplicate email before ever calling Firebase', async () => {
    const { service, findByEmail, provisionStaffAccount } = buildHarness();
    findByEmail.mockResolvedValue({ id: 'existing-user' });

    await expect(service.createStaffUser(buildDto(), actor)).rejects.toBeInstanceOf(ConflictException);
    expect(provisionStaffAccount).not.toHaveBeenCalled();
  });

  it('rolls back the Firebase user when the DB insert fails after Firebase creation succeeded', async () => {
    const { service, create, deleteUser } = buildHarness();
    create.mockRejectedValueOnce(new Error('db insert failed'));

    await expect(service.createStaffUser(buildDto(), actor)).rejects.toThrow('db insert failed');
    expect(deleteUser).toHaveBeenCalledWith('firebase-uid-1');
  });

  it('rolls back the Firebase user when the employee-profile insert fails for an EMPLOYEE role', async () => {
    const { service, employeeProfileCreate, deleteUser } = buildHarness();
    employeeProfileCreate.mockRejectedValueOnce(new Error('profile insert failed'));

    await expect(service.createStaffUser(buildDto(), actor)).rejects.toThrow('profile insert failed');
    expect(deleteUser).toHaveBeenCalledWith('firebase-uid-1');
  });

  it('propagates a Firebase provisioning failure without touching the database', async () => {
    const { service, provisionStaffAccount, create } = buildHarness();
    provisionStaffAccount.mockRejectedValue(new ConflictException('email already exists in Firebase'));

    await expect(service.createStaffUser(buildDto(), actor)).rejects.toBeInstanceOf(ConflictException);
    expect(create).not.toHaveBeenCalled();
  });
});

/**
 * Phase 3 (Disable/Archive/Restore lifecycle). Covers every guard from
 * the approved design: mandatory-reason plumbing (validated at the DTO
 * layer, not re-tested here — this exercises the service with an
 * already-valid reason string), self-action prevention, the
 * last-active-Super-Admin lockout guard, session revocation scoped to
 * exactly Disable/Archive (never Restore), the employee-reassignment
 * gate before Archive, and one immutable audit row per transition.
 */
describe('UsersService — Disable / Archive / Restore lifecycle', () => {
  const actor = { id: 'admin-1', role: UserRole.ADMIN } as never;

  function buildTarget(overrides: Record<string, unknown> = {}) {
    return {
      id: 'target-1',
      role: UserRole.EMPLOYEE,
      status: AccountStatus.ACTIVE,
      firebaseUid: 'target-firebase-uid',
      ...overrides,
    };
  }

  function buildHarness(target: ReturnType<typeof buildTarget>) {
    const findOneById = jest.fn().mockResolvedValue(target);
    const update = jest.fn().mockImplementation((id, patch) => Promise.resolve({ ...target, id, ...patch }));
    const countActiveByRole = jest.fn().mockResolvedValue(1);
    const findOneWithEmployeeProfile = jest
      .fn()
      .mockImplementation((id) => Promise.resolve({ ...target, id, employeeProfile: null }));
    const userRepository = {
      findOneById,
      update,
      countActiveByRole,
      findOneWithEmployeeProfile,
    } as unknown as UserRepository;

    const employeeProfileRepository = {} as unknown as EmployeeProfileRepository;

    const revokeSessions = jest.fn().mockResolvedValue(undefined);
    const firebaseAdminService = { revokeSessions } as unknown as FirebaseAdminService;

    const findActiveAssignedTo = jest.fn().mockResolvedValue([]);
    const loanApplicationRepository = { findActiveAssignedTo } as unknown as LoanApplicationRepository;

    const auditLogCreate = jest.fn().mockImplementation((data) => data);
    const auditLogSave = jest.fn().mockResolvedValue(undefined);
    const auditLogRepository = {
      create: auditLogCreate,
      save: auditLogSave,
    } as unknown as Repository<AuditLogEntity>;

    const service = new UsersService(
      userRepository,
      employeeProfileRepository,
      firebaseAdminService,
      loanApplicationRepository,
      auditLogRepository,
    );

    return {
      service,
      findOneById,
      update,
      countActiveByRole,
      revokeSessions,
      findActiveAssignedTo,
      auditLogCreate,
      auditLogSave,
    };
  }

  describe('disableStaffUser', () => {
    it('transitions to DISABLED, revokes sessions, and writes one audit row', async () => {
      const { service, update, revokeSessions, auditLogCreate, auditLogSave } = buildHarness(buildTarget());

      await service.disableStaffUser('target-1', 'Under investigation', actor);

      expect(update).toHaveBeenCalledWith(
        'target-1',
        expect.objectContaining({
          status: AccountStatus.DISABLED,
          statusReason: 'Under investigation',
          statusChangedById: 'admin-1',
          isActive: false,
        }),
      );
      expect(revokeSessions).toHaveBeenCalledWith('target-firebase-uid');
      expect(auditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'staff_disabled',
          entityId: 'target-1',
          metadata: expect.objectContaining({ reason: 'Under investigation', toStatus: AccountStatus.DISABLED }),
        }),
      );
      expect(auditLogSave).toHaveBeenCalled();
    });

    it('rejects disabling one\'s own account', async () => {
      const { service, update } = buildHarness(buildTarget({ id: 'admin-1' }));

      await expect(
        service.disableStaffUser('admin-1', 'reason', { id: 'admin-1', role: UserRole.ADMIN } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(update).not.toHaveBeenCalled();
    });

    it('rejects disabling the last active Super Admin', async () => {
      const { service, update, countActiveByRole } = buildHarness(
        buildTarget({ id: 'target-admin', role: UserRole.ADMIN }),
      );
      countActiveByRole.mockResolvedValue(0);

      await expect(service.disableStaffUser('target-admin', 'reason', actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(update).not.toHaveBeenCalled();
    });

    it('allows disabling a Super Admin when another active Super Admin remains', async () => {
      const { service, update, countActiveByRole } = buildHarness(
        buildTarget({ id: 'target-admin', role: UserRole.ADMIN }),
      );
      countActiveByRole.mockResolvedValue(1);

      await expect(
        service.disableStaffUser('target-admin', 'reason', actor),
      ).resolves.toBeDefined();
      expect(update).toHaveBeenCalled();
    });

    it('rejects disabling an already-disabled account', async () => {
      const { service, update } = buildHarness(buildTarget({ status: AccountStatus.DISABLED }));

      await expect(service.disableStaffUser('target-1', 'reason', actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('archiveStaffUser', () => {
    it('transitions to ARCHIVED and revokes sessions when there is no active work', async () => {
      const { service, update, revokeSessions, findActiveAssignedTo } = buildHarness(buildTarget());

      await service.archiveStaffUser('target-1', 'Resigned', actor);

      expect(findActiveAssignedTo).toHaveBeenCalledWith('target-1');
      expect(update).toHaveBeenCalledWith(
        'target-1',
        expect.objectContaining({ status: AccountStatus.ARCHIVED, statusReason: 'Resigned' }),
      );
      expect(revokeSessions).toHaveBeenCalledWith('target-firebase-uid');
    });

    it('blocks archiving an employee with active leads still assigned', async () => {
      const { service, update, findActiveAssignedTo } = buildHarness(buildTarget());
      findActiveAssignedTo.mockResolvedValue([{ id: 'lead-1' }, { id: 'lead-2' }]);

      await expect(service.archiveStaffUser('target-1', 'Resigned', actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(update).not.toHaveBeenCalled();
    });

    it('does not check active leads for a non-EMPLOYEE role', async () => {
      const { service, findActiveAssignedTo } = buildHarness(buildTarget({ role: UserRole.MANAGER }));

      await service.archiveStaffUser('target-1', 'Resigned', actor);

      expect(findActiveAssignedTo).not.toHaveBeenCalled();
    });

    it('rejects archiving one\'s own account', async () => {
      const { service } = buildHarness(buildTarget({ id: 'admin-1' }));

      await expect(
        service.archiveStaffUser('admin-1', 'reason', { id: 'admin-1', role: UserRole.ADMIN } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects archiving the last active Super Admin', async () => {
      const { service, countActiveByRole } = buildHarness(
        buildTarget({ id: 'target-admin', role: UserRole.ADMIN }),
      );
      countActiveByRole.mockResolvedValue(0);

      await expect(service.archiveStaffUser('target-admin', 'reason', actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('allows archiving directly from DISABLED', async () => {
      const { service, update } = buildHarness(buildTarget({ status: AccountStatus.DISABLED }));

      await service.archiveStaffUser('target-1', 'Resigned', actor);

      expect(update).toHaveBeenCalledWith(
        'target-1',
        expect.objectContaining({ status: AccountStatus.ARCHIVED }),
      );
    });

    it('rejects archiving an already-archived account', async () => {
      const { service, update } = buildHarness(buildTarget({ status: AccountStatus.ARCHIVED }));

      await expect(service.archiveStaffUser('target-1', 'reason', actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('restoreStaffUser', () => {
    it('transitions a DISABLED account back to ACTIVE without touching sessions', async () => {
      const { service, update, revokeSessions, auditLogCreate } = buildHarness(
        buildTarget({ status: AccountStatus.DISABLED }),
      );

      await service.restoreStaffUser('target-1', actor);

      expect(update).toHaveBeenCalledWith(
        'target-1',
        expect.objectContaining({ status: AccountStatus.ACTIVE, statusReason: null, isActive: true }),
      );
      expect(revokeSessions).not.toHaveBeenCalled();
      expect(auditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'staff_restored', metadata: expect.objectContaining({ toStatus: AccountStatus.ACTIVE }) }),
      );
    });

    it('transitions an ARCHIVED account back to ACTIVE', async () => {
      const { service, update } = buildHarness(buildTarget({ status: AccountStatus.ARCHIVED }));

      await service.restoreStaffUser('target-1', actor);

      expect(update).toHaveBeenCalledWith('target-1', expect.objectContaining({ status: AccountStatus.ACTIVE }));
    });

    it('rejects restoring an already-active account', async () => {
      const { service, update } = buildHarness(buildTarget({ status: AccountStatus.ACTIVE }));

      await expect(service.restoreStaffUser('target-1', actor)).rejects.toBeInstanceOf(ConflictException);
      expect(update).not.toHaveBeenCalled();
    });
  });
});

/**
 * Phase 4 — "Resend Invite" / "Password Reset" share one backend
 * method; the audit action name is the only thing that distinguishes
 * them (`staff_invite_resent` when never activated, `staff_password_reset`
 * once they have), and both are blocked for a non-ACTIVE account.
 */
describe('UsersService — resendInviteOrResetPassword', () => {
  const actor = { id: 'admin-1', role: UserRole.ADMIN } as never;

  function buildTarget(overrides: Record<string, unknown> = {}) {
    return {
      id: 'target-1',
      role: UserRole.EMPLOYEE,
      status: AccountStatus.ACTIVE,
      firebaseUid: 'target-firebase-uid',
      email: 'target@example.invalid',
      activatedAt: null,
      ...overrides,
    };
  }

  function buildHarness(target: ReturnType<typeof buildTarget>) {
    const findOneById = jest.fn().mockResolvedValue(target);
    const findOneWithEmployeeProfile = jest
      .fn()
      .mockImplementation((id) => Promise.resolve({ ...target, id, employeeProfile: null }));
    const userRepository = { findOneById, findOneWithEmployeeProfile } as unknown as UserRepository;

    const employeeProfileRepository = {} as unknown as EmployeeProfileRepository;

    const generatePasswordSetupLink = jest.fn().mockResolvedValue('https://example.com/fresh-link');
    const firebaseAdminService = { generatePasswordSetupLink } as unknown as FirebaseAdminService;

    const loanApplicationRepository = {} as unknown as LoanApplicationRepository;

    const auditLogCreate = jest.fn().mockImplementation((data) => data);
    const auditLogSave = jest.fn().mockResolvedValue(undefined);
    const auditLogRepository = {
      create: auditLogCreate,
      save: auditLogSave,
    } as unknown as Repository<AuditLogEntity>;

    const service = new UsersService(
      userRepository,
      employeeProfileRepository,
      firebaseAdminService,
      loanApplicationRepository,
      auditLogRepository,
    );

    return { service, generatePasswordSetupLink, auditLogCreate };
  }

  it('generates a fresh link and logs staff_invite_resent for a never-activated account', async () => {
    const { service, generatePasswordSetupLink, auditLogCreate } = buildHarness(
      buildTarget({ activatedAt: null }),
    );

    const result = await service.resendInviteOrResetPassword('target-1', actor);

    expect(generatePasswordSetupLink).toHaveBeenCalledWith('target@example.invalid');
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'staff_invite_resent', actorId: 'admin-1' }),
    );
    expect(result.inviteLink).toBe('https://example.com/fresh-link');
  });

  it('logs staff_password_reset for an account that has already signed in', async () => {
    const { service, auditLogCreate } = buildHarness(buildTarget({ activatedAt: new Date('2026-01-01') }));

    await service.resendInviteOrResetPassword('target-1', actor);

    expect(auditLogCreate).toHaveBeenCalledWith(expect.objectContaining({ action: 'staff_password_reset' }));
  });

  it('rejects a disabled account', async () => {
    const { service, generatePasswordSetupLink } = buildHarness(
      buildTarget({ status: AccountStatus.DISABLED }),
    );

    await expect(service.resendInviteOrResetPassword('target-1', actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(generatePasswordSetupLink).not.toHaveBeenCalled();
  });

  it('rejects an archived account', async () => {
    const { service, generatePasswordSetupLink } = buildHarness(
      buildTarget({ status: AccountStatus.ARCHIVED }),
    );

    await expect(service.resendInviteOrResetPassword('target-1', actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(generatePasswordSetupLink).not.toHaveBeenCalled();
  });

  it('rejects an account with no email on file', async () => {
    const { service } = buildHarness(buildTarget({ email: null }));

    await expect(service.resendInviteOrResetPassword('target-1', actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

/** Phase 4 — search/filter/sort passthrough on the existing list endpoint. */
describe('UsersService — listStaff (search/filter/sort)', () => {
  function buildHarness() {
    const findStaffPaginated = jest.fn().mockResolvedValue({ items: [], total: 0 });
    const userRepository = { findStaffPaginated } as unknown as UserRepository;
    const employeeProfileRepository = {} as unknown as EmployeeProfileRepository;
    const firebaseAdminService = {} as unknown as FirebaseAdminService;
    const loanApplicationRepository = {} as unknown as LoanApplicationRepository;
    const auditLogRepository = {} as unknown as Repository<AuditLogEntity>;

    const service = new UsersService(
      userRepository,
      employeeProfileRepository,
      firebaseAdminService,
      loanApplicationRepository,
      auditLogRepository,
    );

    return { service, findStaffPaginated };
  }

  it('maps query fields through to the repository, uppercasing sortDir', async () => {
    const { service, findStaffPaginated } = buildHarness();

    await service.listStaff({
      page: 2,
      pageSize: 10,
      search: 'priya',
      role: UserRole.EMPLOYEE,
      status: AccountStatus.ACTIVE,
      sortBy: 'fullName',
      sortDir: 'asc',
    } as never);

    expect(findStaffPaginated).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      search: 'priya',
      role: UserRole.EMPLOYEE,
      status: AccountStatus.ACTIVE,
      sortBy: 'fullName',
      sortDir: 'ASC',
    });
  });

  it('defaults to the pre-Phase-4 behavior when only page/pageSize/sortBy/sortDir are given', async () => {
    const { service, findStaffPaginated } = buildHarness();

    await service.listStaff({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortDir: 'desc',
    } as never);

    expect(findStaffPaginated).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      search: undefined,
      role: undefined,
      status: undefined,
      sortBy: 'createdAt',
      sortDir: 'DESC',
    });
  });
});
