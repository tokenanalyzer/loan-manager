import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import { PaymentStatus } from './enums';
import type { LoanEntity } from './loan.entity';

/**
 * PaymentEntity — a scheduled or made repayment against a loan.
 *
 * Phase 3 scope: schema only — no repayment-schedule generation, late
 * fee calculation, or reconciliation logic.
 */
@Entity('payments')
export class PaymentEntity extends AbstractEntity {
  @Index('idx_payments_loan')
  @Column({ type: 'uuid' })
  loanId!: string;

  @ManyToOne('LoanEntity', (loan: LoanEntity) => loan.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loan_id', foreignKeyConstraintName: 'fk_payments_loan' })
  loan!: LoanEntity;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amountDue!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  amountPaid!: string;

  @Column({ type: 'date' })
  dueDate!: string;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @Index('idx_payments_status')
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.SCHEDULED })
  status!: PaymentStatus;
}
