import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import { LoanApplicationStatus } from './enums';
import type { LoanEntity } from './loan.entity';
import type { UserEntity } from './user.entity';

/**
 * LoanApplicationEntity — a customer's request for a loan, prior to
 * approval/disbursement (which produces a LoanEntity).
 *
 * Phase 3 scope: schema only — no submission/review workflow logic,
 * no validation rules on requested amounts, no notifications.
 */
@Entity('loan_applications')
export class LoanApplicationEntity extends AbstractEntity {
  @Index('idx_loan_applications_applicant')
  @Column({ type: 'uuid' })
  applicantId!: string;

  @ManyToOne('UserEntity', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'applicant_id', foreignKeyConstraintName: 'fk_loan_applications_applicant' })
  applicant!: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  reviewedById?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewed_by_id', foreignKeyConstraintName: 'fk_loan_applications_reviewer' })
  reviewedBy?: UserEntity | null;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  requestedAmount!: string;

  @Column({ type: 'int' })
  requestedTermMonths!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  purpose?: string | null;

  /**
   * Matches a `LoanCategory.id` from the shared Flutter catalog (see
   * `LOAN_CATEGORY_BOUNDS` in `loan-application.constants.ts`).
   * Nullable — older applications and any submission without a
   * category (falls back to the global bounds) have no value here.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  categoryId?: string | null;

  @Index('idx_loan_applications_status')
  @Column({ type: 'enum', enum: LoanApplicationStatus, default: LoanApplicationStatus.SUBMITTED })
  status!: LoanApplicationStatus;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  submittedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  /** Null = Unassigned. Set by the Lead Assignment module, never by the applicant/reviewer flow. */
  @Index('idx_loan_applications_assigned_to')
  @Column({ type: 'uuid', nullable: true })
  assignedToId?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'assigned_to_id',
    foreignKeyConstraintName: 'fk_loan_applications_assigned_to',
  })
  assignedTo?: UserEntity | null;

  @Column({ type: 'timestamptz', nullable: true })
  assignedAt?: Date | null;

  @OneToOne('LoanEntity', (loan: LoanEntity) => loan.application)
  loan?: LoanEntity;
}
