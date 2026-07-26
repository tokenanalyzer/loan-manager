import { ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { AuditLogEntity, UserRole } from '../database/entities';
import type { FirebaseAdminService } from '../firebase/firebase-admin.service';
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

  function buildHarness() {
    const findByEmail = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockImplementation((data) => Promise.resolve({ id: 'new-user', ...data }));
    const findOneWithEmployeeProfile = jest
      .fn()
      .mockImplementation((id) => Promise.resolve({ id, employeeProfile: null }));
    const userRepository = {
      findByEmail,
      create,
      findOneWithEmployeeProfile,
    } as unknown as UserRepository;

    const employeeProfileCreate = jest.fn().mockResolvedValue(undefined);
    const employeeProfileRepository = {
      create: employeeProfileCreate,
    } as unknown as EmployeeProfileRepository;

    const provisionStaffAccount = jest
      .fn()
      .mockResolvedValue({ firebaseUid: 'firebase-uid-1', inviteLink: 'https://example.com/invite' });
    const deleteUser = jest.fn().mockResolvedValue(undefined);
    const firebaseAdminService = {
      provisionStaffAccount,
      deleteUser,
    } as unknown as FirebaseAdminService;

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
      auditLogRepository,
    );

    return {
      service,
      findByEmail,
      create,
      employeeProfileCreate,
      provisionStaffAccount,
      deleteUser,
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
