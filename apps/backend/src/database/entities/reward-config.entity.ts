import { Column, Entity, Unique } from 'typeorm';

import { AbstractEntity } from './abstract.entity';

/**
 * RewardConfigEntity — one row per loan category's reward program.
 * Only a `'personal'` row exists today (see the AddRewardSystem
 * migration's seed insert), matching "rewards apply only to Personal
 * Loans" — but keying by category rather than being a single global
 * row means a second category getting its own program later is a data
 * change, not a schema change.
 *
 * Admin-configurable via `PATCH /v1/rewards/config` (admin/employee
 * only) — no admin-panel UI ships with this yet, but the endpoint is
 * real, role-guarded, and the only way this table is ever written to
 * after the initial seed.
 */
@Entity('reward_configs')
@Unique('uq_reward_configs_category_id', ['categoryId'])
export class RewardConfigEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 64 })
  categoryId!: string;

  /** "Up to X%" — e.g. 1.00 means up to 1%. */
  @Column({ type: 'numeric', precision: 5, scale: 2 })
  rewardPercent!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** Shown to the customer verbatim — e.g. "Earn Rewards Up To 1% on eligible Personal Loan disbursements." */
  @Column({ type: 'text' })
  customerMessage!: string;
}
