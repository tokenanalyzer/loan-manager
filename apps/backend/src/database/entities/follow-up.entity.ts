import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import { FollowUpStatus } from './enums';
import type { LoanApplicationEntity } from './loan-application.entity';
import type { UserEntity } from './user.entity';

/**
 * FollowUpEntity — a scheduled, note-bearing action an employee owns
 * against a lead. See `FollowUpStatus`'s doc comment for why this one
 * entity covers Tasks/Follow-ups/Reminders/Call Notes at once rather
 * than four separate concepts.
 *
 * Employee CRM scope: CRUD only, ownership-scoped the same way as
 * every other employee-owned resource in this codebase (`assignedToId`
 * checked against the caller, mirroring `LoanApplicationEntity`'s own
 * "lead locking" pattern) — no cross-employee visibility, no admin
 * override screen yet (not requested).
 */
@Entity('follow_ups')
export class FollowUpEntity extends AbstractEntity {
  @Index('idx_follow_ups_loan_application')
  @Column({ type: 'uuid' })
  loanApplicationId!: string;

  @ManyToOne('LoanApplicationEntity', { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'loan_application_id',
    foreignKeyConstraintName: 'fk_follow_ups_loan_application',
  })
  loanApplication!: LoanApplicationEntity;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id', foreignKeyConstraintName: 'fk_follow_ups_created_by' })
  createdBy?: UserEntity | null;

  /** Almost always the same as `createdById` (employees manage their own follow-ups) — kept distinct in case of future reassignment. */
  @Index('idx_follow_ups_assigned_to')
  @Column({ type: 'uuid' })
  assignedToId!: string;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to_id', foreignKeyConstraintName: 'fk_follow_ups_assigned_to' })
  assignedTo?: UserEntity | null;

  /** Doubles as the call-note content for this follow-up. */
  @Column({ type: 'text' })
  note!: string;

  /** The "next follow-up date" — also what makes a follow-up "today's" or "overdue". */
  @Index('idx_follow_ups_due_at')
  @Column({ type: 'timestamptz' })
  dueAt!: Date;

  @Index('idx_follow_ups_status')
  @Column({ type: 'enum', enum: FollowUpStatus, default: FollowUpStatus.PENDING })
  status!: FollowUpStatus;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date | null;
}
