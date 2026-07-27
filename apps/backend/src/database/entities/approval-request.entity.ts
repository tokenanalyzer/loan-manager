import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import { ApprovalRequestStatus } from './enums';
import type { UserEntity } from './user.entity';

/**
 * ApprovalRequestEntity — a pending (or decided) maker-checker request
 * for a gated action (Admin Authentication Module, Phase 5).
 *
 * `action` is a free-text `varchar`, deliberately not a Postgres enum —
 * mirrors `AuditLogEntity.action`'s existing convention, so a brand-new
 * gated action (e.g. a future Role Change) never needs a schema
 * migration, only a new `ApprovalActionType` member and an executor
 * registration. `status`, by contrast, is a small, closed, table-local
 * state machine, so it *is* a real enum — see `ApprovalRequestStatus`.
 *
 * Unlike `AuditLogEntity` (deliberately append-only, no `updatedAt`),
 * this extends `AbstractEntity`: a request's `status` is mutated in
 * place as it moves from pending to a terminal state.
 */
@Entity('approval_requests')
@Index('idx_approval_requests_target_status', ['targetUserId', 'status'])
@Index('idx_approval_requests_status', ['status'])
@Index('idx_approval_requests_maker', ['makerId'])
export class ApprovalRequestEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 64 })
  action!: string;

  @Column({ type: 'uuid', nullable: true })
  targetUserId?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_user_id', foreignKeyConstraintName: 'fk_approval_requests_target_user' })
  targetUser?: UserEntity | null;

  /** The `ORG_ADMIN` (or whichever role the policy currently gates) who submitted this request. */
  @Column({ type: 'uuid', nullable: true })
  makerId?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'maker_id', foreignKeyConstraintName: 'fk_approval_requests_maker' })
  maker?: UserEntity | null;

  /** Null while pending — the Super Admin who approved/rejected this. */
  @Column({ type: 'uuid', nullable: true })
  checkerId?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'checker_id', foreignKeyConstraintName: 'fk_approval_requests_checker' })
  checker?: UserEntity | null;

  @Column({ type: 'enum', enum: ApprovalRequestStatus, default: ApprovalRequestStatus.PENDING })
  status!: ApprovalRequestStatus;

  /** Action-specific input captured at request time (e.g. `{ reason }` for disable/archive; `{}` for restore) — replayed into the executor on approval. */
  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown> | null;

  /** Checker's note — required on reject, optional on approve. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  decisionNote?: string | null;

  /** Populated only when `status = FAILED` — the error raised when the executor re-ran the action's preconditions at approval time and one had drifted. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  failureReason?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt?: Date | null;
}
