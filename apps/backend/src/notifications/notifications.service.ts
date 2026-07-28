import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { NotificationEntity } from '../database/entities';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { UserRepository } from '../users/user.repository';

import { NotificationRepository } from './notification.repository';

/**
 * NotificationsService — Phase 6 scope: list-mine, mark-as-read, and
 * `createForUser` (an internal helper other services call when a
 * real business event happens — currently only
 * LoanApplicationsService, on approve/reject).
 *
 * Phase 8: `createForUser` accepts an optional EntityManager so it can
 * participate in a caller's database transaction (e.g. the loan
 * review decision path). This keeps notification-creation logic in one
 * place — no duplicated insert logic in the caller — while still being
 * atomic with the business event that triggered it.
 *
 * Customer App Backend Integration, Phase 3: `createForUser` also
 * fires an FCM push, best-effort, right after creating the in-app row
 * — the single choke point every current call site already goes
 * through, so none of them needed to change. See
 * `FirebaseAdminService.sendPushNotification`'s doc comment for why
 * this can never fail the caller's transaction.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly userRepository: UserRepository,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {}

  async listForUser(userId: string): Promise<NotificationEntity[]> {
    return this.notificationRepository.findAllByUser(userId);
  }

  async markAsRead(userId: string, notificationId: string): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.findOneById(notificationId);
    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not have access to this notification.');
    }

    const updated = await this.notificationRepository.update(notificationId, { isRead: true });
    if (!updated) {
      throw new NotFoundException('Notification not found after update.');
    }
    return updated;
  }

  /**
   * Called by other services (e.g. LoanApplicationsService) — not
   * exposed via HTTP directly.
   *
   * When `manager` is provided, the insert runs on that transactional
   * EntityManager so it commits/rolls back with the caller's
   * transaction; otherwise it uses the module's own repository.
   */
  async createForUser(
    params: {
      userId: string;
      title: string;
      body: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
    },
    manager?: EntityManager,
  ): Promise<NotificationEntity> {
    const data = {
      userId: params.userId,
      title: params.title,
      body: params.body,
      relatedEntityType: params.relatedEntityType ?? null,
      relatedEntityId: params.relatedEntityId ?? null,
      isRead: false,
    };

    const notification = manager
      ? await manager.save(manager.create(NotificationEntity, data))
      : await this.notificationRepository.create(data);

    await this.sendPushBestEffort(params);

    return notification;
  }

  /**
   * Fire-and-forget push send — deliberately uses its own
   * non-transactional read of the recipient's token (via
   * `userRepository`, not `manager`) rather than joining the caller's
   * transaction: this is a side effect of the notification, not part
   * of what needs to commit/roll back atomically with it, and every
   * error path already stops at `FirebaseAdminService` (never throws)
   * so a push problem can never surface here as a caller-visible
   * failure either.
   */
  private async sendPushBestEffort(params: {
    userId: string;
    title: string;
    body: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }): Promise<void> {
    const recipient = await this.userRepository.findOneById(params.userId);
    if (!recipient?.fcmToken) {
      return;
    }

    const data: Record<string, string> = {};
    if (params.relatedEntityType) data.relatedEntityType = params.relatedEntityType;
    if (params.relatedEntityId) data.relatedEntityId = params.relatedEntityId;

    const { staleToken } = await this.firebaseAdminService.sendPushNotification(
      recipient.fcmToken,
      { title: params.title, body: params.body },
      data,
    );

    if (staleToken) {
      await this.userRepository.update(recipient.id, { fcmToken: null, fcmTokenUpdatedAt: null });
    }
  }
}
