import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import type { PinoLogger } from 'nestjs-pino';

import { FirebaseAdminService } from './firebase-admin.service';

jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));

describe('FirebaseAdminService', () => {
  function buildLogger(): PinoLogger {
    return { setContext: jest.fn(), error: jest.fn(), warn: jest.fn() } as unknown as PinoLogger;
  }

  function mockAuth(overrides: Partial<ReturnType<typeof getAuth>> = {}) {
    const auth = {
      createUser: jest.fn().mockResolvedValue({ uid: 'new-firebase-uid' }),
      generatePasswordResetLink: jest.fn().mockResolvedValue('https://example.com/reset'),
      deleteUser: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
    (getAuth as jest.Mock).mockReturnValue(auth);
    return auth;
  }

  afterEach(() => jest.clearAllMocks());

  it('throws ServiceUnavailableException when Firebase Admin is not configured', async () => {
    const service = new FirebaseAdminService(null, buildLogger());

    await expect(service.provisionStaffAccount('a@b.com', 'A B')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('creates the user and returns the generated invite link', async () => {
    const auth = mockAuth();
    const service = new FirebaseAdminService({} as never, buildLogger());

    const result = await service.provisionStaffAccount('a@b.com', 'A B');

    expect(auth.createUser).toHaveBeenCalledWith({
      email: 'a@b.com',
      displayName: 'A B',
      emailVerified: false,
      disabled: false,
    });
    expect((auth.createUser as jest.Mock).mock.calls[0][0]).not.toHaveProperty('password');
    expect(result).toEqual({ firebaseUid: 'new-firebase-uid', inviteLink: 'https://example.com/reset' });
  });

  it('translates auth/email-already-exists into a ConflictException', async () => {
    mockAuth({
      createUser: jest.fn().mockRejectedValue({ code: 'auth/email-already-exists' }),
    });
    const service = new FirebaseAdminService({} as never, buildLogger());

    await expect(service.provisionStaffAccount('a@b.com', 'A B')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rolls back the created user when invite-link generation fails', async () => {
    const auth = mockAuth({
      generatePasswordResetLink: jest.fn().mockRejectedValue(new Error('link generation failed')),
    });
    const service = new FirebaseAdminService({} as never, buildLogger());

    await expect(service.provisionStaffAccount('a@b.com', 'A B')).rejects.toThrow('link generation failed');
    expect(auth.deleteUser).toHaveBeenCalledWith('new-firebase-uid');
  });

  it('deleteUser swallows its own errors rather than throwing (rollback must never mask the original error)', async () => {
    mockAuth({ deleteUser: jest.fn().mockRejectedValue(new Error('delete also failed')) });
    const service = new FirebaseAdminService({} as never, buildLogger());

    await expect(service.deleteUser('some-uid')).resolves.toBeUndefined();
  });
});
