import type { DecodedIdToken } from 'firebase-admin/auth';
import type { PinoLogger } from 'nestjs-pino';

import { UserEntity, UserRole } from '../database/entities';
import type { UserRepository } from '../users/user.repository';
import { PENDING_STAFF_UID_PREFIX } from '../users/users.service';

import { AuthService } from './auth.service';

/**
 * The staff-invite linking gate is the security-critical part of this
 * service — the approved architecture rule requires ALL SIX
 * conditions to hold before a pre-provisioned row is ever linked to a
 * real Firebase sign-in, and fail-safe (fall through to normal
 * customer creation, never link) on any single one failing. Each test
 * below flips exactly one condition to confirm the gate actually
 * enforces it, rather than trusting the implementation by inspection.
 */
describe('AuthService — staff invite linking', () => {
  function buildPendingRow(overrides: Partial<UserEntity> = {}): UserEntity {
    return {
      id: 'user-1',
      firebaseUid: `${PENDING_STAFF_UID_PREFIX}00000000-0000-0000-0000-000000000000`,
      email: 'staff@example.com',
      role: UserRole.EMPLOYEE,
      isActive: true,
      invitedAt: new Date('2026-01-01'),
      activatedAt: null,
      ...overrides,
    } as UserEntity;
  }

  function buildService(pendingRow: UserEntity | null) {
    const findByFirebaseUid = jest.fn().mockResolvedValue(null);
    const findByEmail = jest.fn().mockResolvedValue(pendingRow);
    const create = jest.fn().mockImplementation((data) => Promise.resolve({ id: 'new-user', ...data }));
    const update = jest
      .fn()
      .mockImplementation((id, patch) => Promise.resolve({ ...pendingRow, id, ...patch }));

    const userRepository = { findByFirebaseUid, findByEmail, create, update } as unknown as UserRepository;
    const logger = { setContext: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as PinoLogger;

    return { service: new AuthService(userRepository, logger), userRepository, create, update };
  }

  function buildToken(overrides: Partial<DecodedIdToken> = {}): DecodedIdToken {
    return {
      uid: 'firebase-uid-real',
      email: 'staff@example.com',
      ...overrides,
    } as DecodedIdToken;
  }

  it('links when all six conditions hold', async () => {
    const { service, update } = buildService(buildPendingRow());

    await service.syncFromFirebaseToken(buildToken());

    expect(update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ firebaseUid: 'firebase-uid-real', activatedAt: expect.any(Date) }),
    );
  });

  it('never links a CUSTOMER row — refuses to promote instead of falling through silently', async () => {
    const { service, update, create } = buildService(buildPendingRow({ role: UserRole.CUSTOMER }));

    await service.syncFromFirebaseToken(buildToken());

    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ role: UserRole.CUSTOMER }));
  });

  it('does not link once already activated', async () => {
    const { service, update, create } = buildService(buildPendingRow({ activatedAt: new Date('2026-02-01') }));

    await service.syncFromFirebaseToken(buildToken());

    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });

  it('does not link a row whose firebaseUid is no longer the placeholder sentinel', async () => {
    const { service, update, create } = buildService(buildPendingRow({ firebaseUid: 'some-other-uid' }));

    await service.syncFromFirebaseToken(buildToken());

    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });

  it('does not link a deactivated staff row', async () => {
    const { service, update, create } = buildService(buildPendingRow({ isActive: false }));

    await service.syncFromFirebaseToken(buildToken());

    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });

  it('does not link a row that was never created through the staff provisioning flow (invitedAt null)', async () => {
    const { service, update, create } = buildService(buildPendingRow({ invitedAt: null }));

    await service.syncFromFirebaseToken(buildToken());

    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });

  it('falls through to normal customer creation when no row matches the email at all', async () => {
    const { service, update, create } = buildService(null);

    await service.syncFromFirebaseToken(buildToken());

    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ role: UserRole.CUSTOMER }));
  });
});
