import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import type { UserEntity } from './user.entity';

/**
 * NotificationEntity — an in-app notification for a user.
 *
 * Phase 6 scope: created by real business events (currently: loan
 * application decisions — see LoanApplicationsService). No push
 * delivery (FCM) is wired up yet — these are in-app/list only.
 */
@Entity('notifications')
export class NotificationEntity extends AbstractEntity {
  @Index('idx_notifications_user')
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_notifications_user' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 1000 })
  body!: string;

  /** e.g. 'loan_application' — free-form, no FK (the related row may
   *  belong to any of several tables depending on notification type). */
  @Column({ type: 'varchar', length: 64, nullable: true })
  relatedEntityType?: string | null;

  @Column({ type: 'uuid', nullable: true })
  relatedEntityId?: string | null;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;
}
