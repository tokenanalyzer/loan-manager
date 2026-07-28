import type { EntityManager } from 'typeorm';

import type { UserEntity } from '../database/entities';
import type { FirebaseAdminService } from '../firebase/firebase-admin.service';
import type { UserRepository } from '../users/user.repository';

import type { NotificationRepository } from './notification.repository';
import { NotificationsService } from './notifications.service';

/**
 * Customer App Backend Integration, Phase 3: `createForUser` is the
 * single choke point every existing notification call site already
 * goes through, and now also fires a best-effort FCM push through it.
 * These tests cover the new push-send/stale-token-clearing behavior —
 * `createForUser`'s own insert logic (transactional vs. non-
 * transactional) already existed and isn't re-tested here.
 */
describe('NotificationsService.createForUser — push delivery', () => {
  function buildService(overrides: {
    recipient?: Partial<UserEntity> | null;
    sendPushNotification?: jest.Mock;
  }) {
    const create = jest.fn().mockResolvedValue({ id: 'notification-1' });
    const notificationRepository = { create } as unknown as NotificationRepository;

    const findOneById = jest
      .fn()
      .mockResolvedValue(overrides.recipient === undefined ? { id: 'user-1', fcmToken: 'device-token' } : overrides.recipient);
    const update = jest.fn().mockResolvedValue(undefined);
    const userRepository = { findOneById, update } as unknown as UserRepository;

    const sendPushNotification =
      overrides.sendPushNotification ?? jest.fn().mockResolvedValue({ staleToken: false });
    const firebaseAdminService = { sendPushNotification } as unknown as FirebaseAdminService;

    const service = new NotificationsService(notificationRepository, userRepository, firebaseAdminService);

    return { service, create, findOneById, update, sendPushNotification };
  }

  const params = {
    userId: 'user-1',
    title: 'Loan application approved',
    body: 'Your application was approved.',
    relatedEntityType: 'loan_application',
    relatedEntityId: 'app-1',
  };

  it('creates the in-app notification and sends a push using the recipient token', async () => {
    const { service, create, sendPushNotification } = buildService({});

    await service.createForUser(params);

    expect(create).toHaveBeenCalledWith({
      userId: 'user-1',
      title: params.title,
      body: params.body,
      relatedEntityType: 'loan_application',
      relatedEntityId: 'app-1',
      isRead: false,
    });
    expect(sendPushNotification).toHaveBeenCalledWith(
      'device-token',
      { title: params.title, body: params.body },
      { relatedEntityType: 'loan_application', relatedEntityId: 'app-1' },
    );
  });

  it('does not attempt a push when the recipient has no fcmToken', async () => {
    const { service, sendPushNotification } = buildService({ recipient: { id: 'user-1', fcmToken: null } });

    await service.createForUser(params);

    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it('does not attempt a push when the recipient no longer exists', async () => {
    const { service, sendPushNotification } = buildService({ recipient: null });

    await service.createForUser(params);

    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it('clears the stale token when FCM reports it as unregistered', async () => {
    const { service, update } = buildService({
      sendPushNotification: jest.fn().mockResolvedValue({ staleToken: true }),
    });

    await service.createForUser(params);

    expect(update).toHaveBeenCalledWith('user-1', { fcmToken: null, fcmTokenUpdatedAt: null });
  });

  it('does not clear the token when the push succeeds', async () => {
    const { service, update } = buildService({});

    await service.createForUser(params);

    expect(update).not.toHaveBeenCalled();
  });

  it('still creates the notification and returns it when a transactional manager is passed', async () => {
    const savedEntity = { id: 'notification-2' };
    const manager = {
      create: jest.fn().mockReturnValue(savedEntity),
      save: jest.fn().mockResolvedValue(savedEntity),
    } as unknown as EntityManager;
    const { service, create } = buildService({});

    const result = await service.createForUser(params, manager);

    expect(create).not.toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalledWith(savedEntity);
    expect(result).toBe(savedEntity);
  });
});
