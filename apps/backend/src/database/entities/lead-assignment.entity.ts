import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { LoanApplicationEntity } from './loan-application.entity';
import type { UserEntity } from './user.entity';

/** Which kind of ownership change a `LeadAssignmentEntity` row records. */
export enum LeadAssignmentAction {
  ASSIGN = 'assign',
  REASSIGN = 'reassign',
  TRANSFER = 'transfer',
}

/**
 * LeadAssignmentEntity — append-only history of every lead-ownership
 * change on a `LoanApplicationEntity` (assign / reassign / bulk
 * transfer). Mirrors `AuditLogEntity`'s shape (no `AbstractEntity`, no
 * `updatedAt`/soft-delete) since this is a record of what happened,
 * never edited after the fact.
 */
@Entity('lead_assignment_history')
@Index('idx_lead_assignment_history_application', ['loanApplicationId'])
export class LeadAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  loanApplicationId!: string;

  @ManyToOne('LoanApplicationEntity', { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'loan_application_id',
    foreignKeyConstraintName: 'fk_lead_assignment_history_application',
  })
  loanApplication!: LoanApplicationEntity;

  /** Null when this is the first-ever assignment (was Unassigned). */
  @Column({ type: 'uuid', nullable: true })
  previousAssigneeId?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'previous_assignee_id',
    foreignKeyConstraintName: 'fk_lead_assignment_history_previous_assignee',
  })
  previousAssignee?: UserEntity | null;

  @Column({ type: 'uuid' })
  newAssigneeId!: string;

  @ManyToOne('UserEntity', { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'new_assignee_id',
    foreignKeyConstraintName: 'fk_lead_assignment_history_new_assignee',
  })
  newAssignee!: UserEntity;

  /** The admin who performed the action. Null only if that admin account is later removed. */
  @Column({ type: 'uuid', nullable: true })
  assignedById?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'assigned_by_id',
    foreignKeyConstraintName: 'fk_lead_assignment_history_assigned_by',
  })
  assignedBy?: UserEntity | null;

  @Column({ type: 'varchar', length: 32 })
  action!: LeadAssignmentAction;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
