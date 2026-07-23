import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, Unique } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import { LoanStatus } from './enums';
import type { LoanApplicationEntity } from './loan-application.entity';
import type { PaymentEntity } from './payment.entity';
import type { UserEntity } from './user.entity';

/**
 * LoanEntity — an approved/active loan, optionally originating from a
 * LoanApplicationEntity.
 *
 * Disbursement (PENDING → ACTIVE) is implemented in
 * `LoanApplicationsService.disburse` — see that method for the
 * transition and its side effects (reward generation, Top-Up
 * eligibility). Interest accrual calculation and repayment-schedule
 * generation are still out of scope.
 */
@Entity('loans')
@Unique('uq_loans_loan_number', ['loanNumber'])
@Unique('uq_loans_application_id', ['applicationId'])
export class LoanEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 64 })
  loanNumber!: string;

  @Column({ type: 'uuid', nullable: true })
  applicationId?: string | null;

  @OneToOne('LoanApplicationEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'application_id', foreignKeyConstraintName: 'fk_loans_application' })
  application?: LoanApplicationEntity | null;

  @Index('idx_loans_customer')
  @Column({ type: 'uuid' })
  customerId!: string;

  @ManyToOne('UserEntity', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'fk_loans_customer' })
  customer!: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  createdById?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id', foreignKeyConstraintName: 'fk_loans_created_by' })
  createdBy?: UserEntity | null;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  principalAmount!: string;

  @Column({ type: 'numeric', precision: 6, scale: 3 })
  interestRate!: string;

  @Column({ type: 'int' })
  termMonths!: number;

  @Index('idx_loans_status')
  @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.PENDING })
  status!: LoanStatus;

  @Column({ type: 'timestamptz', nullable: true })
  disbursedAt?: Date | null;

  @Column({ type: 'date', nullable: true })
  maturityDate?: string | null;

  /** Bank transaction reference (UTR/NEFT/IMPS number) for the actual disbursal — proof the money genuinely moved, not backend-generated. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  disbursementReference?: string | null;

  @Column({ type: 'uuid', nullable: true })
  disbursedById?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'disbursed_by_id', foreignKeyConstraintName: 'fk_loans_disbursed_by' })
  disbursedBy?: UserEntity | null;

  @Column({ type: 'text', nullable: true })
  disbursementNotes?: string | null;

  @OneToMany('PaymentEntity', (payment: PaymentEntity) => payment.loan)
  payments?: PaymentEntity[];
}
