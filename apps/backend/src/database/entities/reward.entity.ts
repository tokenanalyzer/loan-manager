import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, Unique } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import { RewardStatus } from './enums';
import type { LoanEntity } from './loan.entity';
import type { UserEntity } from './user.entity';

/**
 * RewardEntity — one row per disbursed loan that earned a reward.
 *
 * The only code path that creates a row here is
 * `RewardsService.generateForDisbursedLoan` — nothing currently calls
 * it, because no disbursement workflow exists yet (see the
 * AddRewardSystem migration's doc comment). That is the entire
 * enforcement mechanism for "no reward before disbursement": there is
 * no other way for a row to exist.
 *
 * `categoryId`/`principalAmount`/`rewardPercent` are snapshotted at
 * generation time (not read live from the loan/config each time) so a
 * later admin change to the reward percentage, or the loan category
 * catalog changing, never rewrites history for an already-earned
 * reward.
 */
@Entity('rewards')
@Unique('uq_rewards_loan_id', ['loanId'])
export class RewardEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  loanId!: string;

  @OneToOne('LoanEntity')
  @JoinColumn({ name: 'loan_id', foreignKeyConstraintName: 'fk_rewards_loan' })
  loan?: LoanEntity;

  @Index('idx_rewards_customer')
  @Column({ type: 'uuid' })
  customerId!: string;

  @ManyToOne('UserEntity', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'fk_rewards_customer' })
  customer!: UserEntity;

  @Column({ type: 'varchar', length: 64 })
  categoryId!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  principalAmount!: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  rewardPercent!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  rewardAmount!: string;

  @Column({ type: 'enum', enum: RewardStatus, default: RewardStatus.ACCRUED })
  status!: RewardStatus;

  @Column({ type: 'timestamptz' })
  disbursedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date | null;
}
