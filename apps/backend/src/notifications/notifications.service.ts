import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { NotificationEntity } from '../database/entities';
import { NotificationRepository } from './notification.repository';

/**
 * NotificationsService — Phase 6 scope: list-mine, mark-as-read, and
 * `createForUser` (an internal helper other services call when a
 * real business event happens — currently only
 * LoanApplicationsService, on approve/reject). No push delivery (FCM)
 * yet — in-app list only.
 *
 * Phase 8: `createForUser` accepts an optional EntityManager so it can
 * participate in a caller's database transaction (e.g. the loan
 * review decision path). This keeps notification-creation logic in one
 * place — no duplicated insert logic in the caller — while still being
 * atomic with the business event that triggered it.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

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

    if (manager) {
      return manager.save(manager.create(NotificationEntity, data));
    }

    return this.notificationRepository.create(data);
  }
}
