import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import type { PinoLogger } from 'nestjs-pino';

import { FirebaseAdminService } from './firebase-admin.service';

jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));
jest.mock('firebase-admin/messaging', () => ({ getMessaging: jest.fn() }));

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

  describe('generatePasswordSetupLink', () => {
    it('returns the link Firebase generates for the given email', async () => {
      const auth = mockAuth({
        generatePasswordResetLink: jest.fn().mockResolvedValue('https://example.com/reset-existing'),
      });
      const service = new FirebaseAdminService({} as never, buildLogger());

      const link = await service.generatePasswordSetupLink('existing@b.com');

      expect(auth.generatePasswordResetLink).toHaveBeenCalledWith('existing@b.com');
      expect(link).toBe('https://example.com/reset-existing');
    });

    it('throws ServiceUnavailableException when Firebase Admin is not configured', async () => {
      const service = new FirebaseAdminService(null, buildLogger());

      await expect(service.generatePasswordSetupLink('a@b.com')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('translates auth/user-not-found into a clear ConflictException', async () => {
      mockAuth({
        generatePasswordResetLink: jest.fn().mockRejectedValue({ code: 'auth/user-not-found' }),
      });
      const service = new FirebaseAdminService({} as never, buildLogger());

      await expect(service.generatePasswordSetupLink('a@b.com')).rejects.toBeInstanceOf(ConflictException);
    });

    it('translates the "Unable to create the email action link" internal-error into a clear ConflictException (dev-fixture rows with no real Firebase identity)', async () => {
      mockAuth({
        generatePasswordResetLink: jest.fn().mockRejectedValue({
          code: 'auth/internal-error',
          errorInfo: { message: 'INTERNAL ASSERT FAILED: Unable to create the email action link' },
        }),
      });
      const service = new FirebaseAdminService({} as never, buildLogger());

      await expect(service.generatePasswordSetupLink('a@b.com')).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows an unrelated auth/internal-error unchanged, not mischaracterized as a missing identity', async () => {
      mockAuth({
        generatePasswordResetLink: jest.fn().mockRejectedValue({
          code: 'auth/internal-error',
          errorInfo: { message: 'Some other transient problem' },
        }),
      });
      const service = new FirebaseAdminService({} as never, buildLogger());

      await expect(service.generatePasswordSetupLink('a@b.com')).rejects.not.toBeInstanceOf(ConflictException);
    });

    it('rethrows an unrelated error unchanged', async () => {
      mockAuth({
        generatePasswordResetLink: jest.fn().mockRejectedValue(new Error('network blip')),
      });
      const service = new FirebaseAdminService({} as never, buildLogger());

      await expect(service.generatePasswordSetupLink('a@b.com')).rejects.toThrow('network blip');
    });
  });

  describe('revokeSessions', () => {
    it('calls revokeRefreshTokens for the given uid', async () => {
      const auth = mockAuth({ revokeRefreshTokens: jest.fn().mockResolvedValue(undefined) });
      const service = new FirebaseAdminService({} as never, buildLogger());

      await service.revokeSessions('some-uid');

      expect(auth.revokeRefreshTokens).toHaveBeenCalledWith('some-uid');
    });

    it('is a silent no-op when Firebase Admin is not configured', async () => {
      const service = new FirebaseAdminService(null, buildLogger());

      await expect(service.revokeSessions('some-uid')).resolves.toBeUndefined();
      expect(getAuth).not.toHaveBeenCalled();
    });

    it('swallows its own errors rather than throwing', async () => {
      mockAuth({ revokeRefreshTokens: jest.fn().mockRejectedValue(new Error('revoke failed')) });
      const service = new FirebaseAdminService({} as never, buildLogger());

      await expect(service.revokeSessions('some-uid')).resolves.toBeUndefined();
    });
  });

  describe('sendPushNotification', () => {
    function mockMessaging(overrides: { send?: jest.Mock } = {}) {
      const messaging = { send: overrides.send ?? jest.fn().mockResolvedValue('message-id') };
      (getMessaging as jest.Mock).mockReturnValue(messaging);
      return messaging;
    }

    it('sends via the messaging SDK and reports the token as not stale', async () => {
      const messaging = mockMessaging();
      const service = new FirebaseAdminService({} as never, buildLogger());

      const result = await service.sendPushNotification(
        'device-token',
        { title: 'Hi', body: 'There' },
        { relatedEntityType: 'loan_application', relatedEntityId: 'app-1' },
      );

      expect(messaging.send).toHaveBeenCalledWith({
        token: 'device-token',
        notification: { title: 'Hi', body: 'There' },
        data: { relatedEntityType: 'loan_application', relatedEntityId: 'app-1' },
      });
      expect(result).toEqual({ staleToken: false });
    });

    it('is a silent no-op when Firebase Admin is not configured', async () => {
      const service = new FirebaseAdminService(null, buildLogger());

      const result = await service.sendPushNotification('device-token', { title: 'Hi', body: 'There' });

      expect(result).toEqual({ staleToken: false });
      expect(getMessaging).not.toHaveBeenCalled();
    });

    it('reports a stale token instead of throwing when FCM rejects it as unregistered', async () => {
      mockMessaging({
        send: jest.fn().mockRejectedValue({ code: 'messaging/registration-token-not-registered' }),
      });
      const service = new FirebaseAdminService({} as never, buildLogger());

      const result = await service.sendPushNotification('device-token', { title: 'Hi', body: 'There' });

      expect(result).toEqual({ staleToken: true });
    });

    it('swallows any other error rather than throwing', async () => {
      mockMessaging({ send: jest.fn().mockRejectedValue(new Error('FCM outage')) });
      const service = new FirebaseAdminService({} as never, buildLogger());

      await expect(
        service.sendPushNotification('device-token', { title: 'Hi', body: 'There' }),
      ).resolves.toEqual({ staleToken: false });
    });
  });
});
