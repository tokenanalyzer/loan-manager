import { Column, Entity, JoinColumn, OneToOne, Unique } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import type { UserEntity } from './user.entity';

/**
 * CustomerProfileEntity — customer-specific fields, kept separate from
 * UserEntity so employee/admin rows never carry customer-only columns.
 *
 * Phase 3 scope: structural fields only — no KYC/eligibility logic.
 */
@Entity('customer_profiles')
@Unique('uq_customer_profiles_user_id', ['userId'])
export class CustomerProfileEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @OneToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_customer_profiles_user' })
  user!: UserEntity;

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nationalIdNumber?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine1?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine2?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  city?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  state?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  postalCode?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  country?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  employmentStatus?: string | null;

  /**
   * NUMERIC columns are returned as `string` by node-postgres (and
   * mapped as such by TypeORM) to avoid floating-point precision loss
   * on monetary values — this is intentional, not an oversight.
   */
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  monthlyIncome?: string | null;

  /** Phase 6: privacy/consent fields backing Privacy Settings. */
  @Column({ type: 'boolean', default: false })
  marketingConsent!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  dataConsentAcceptedAt?: Date | null;
}
