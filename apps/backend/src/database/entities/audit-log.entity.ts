import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { UserEntity } from './user.entity';

/**
 * AuditLogEntity — a generic, append-only audit trail record.
 *
 * Intentionally does *not* extend AbstractEntity: audit log rows are
 * immutable (no `updatedAt`/soft-delete). Written to by
 * `CustomersService` (account-deletion requests, KYC review
 * decisions) — see those services for the actual write sites.
 */
@Entity('audit_logs')
@Index('idx_audit_logs_entity', ['entityName', 'entityId'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  actorId?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id', foreignKeyConstraintName: 'fk_audit_logs_actor' })
  actor?: UserEntity | null;

  @Column({ type: 'varchar', length: 128 })
  action!: string;

  @Column({ type: 'varchar', length: 128 })
  entityName!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  entityId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
