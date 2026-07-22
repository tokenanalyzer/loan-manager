import { Column, Entity, JoinColumn, ManyToOne, OneToOne, Unique } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import { KycStatus } from './enums';
import type { UserEntity } from './user.entity';

/**
 * CustomerProfileEntity — customer-specific fields, kept separate from
 * UserEntity so employee/admin rows never carry customer-only columns.
 *
 * India-localization pass: replaces the generic `nationalIdNumber`
 * placeholder with PAN + Aadhaar fields and a manual KYC review
 * workflow (self-attested capture, no live NSDL/UIDAI vendor call —
 * see docs/architecture-review-2026-07.md for that as future work).
 * Aadhaar's full 12-digit number is never stored: only a salted hash
 * (duplicate-detection / future verification) and the last 4 digits
 * (display), consistent with how Indian apps conventionally handle it.
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

  @Column({ type: 'varchar', length: 10, nullable: true })
  panNumber?: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  aadhaarLast4?: string | null;

  /** Salted SHA-256 of the full 12-digit Aadhaar number — never the raw value. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  aadhaarHash?: string | null;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.NOT_SUBMITTED })
  kycStatus!: KycStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  kycRejectionReason?: string | null;

  @Column({ type: 'uuid', nullable: true })
  kycReviewedById?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'kyc_reviewed_by_id',
    foreignKeyConstraintName: 'fk_customer_profiles_kyc_reviewer',
  })
  kycReviewedBy?: UserEntity | null;

  @Column({ type: 'timestamptz', nullable: true })
  kycReviewedAt?: Date | null;

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

  /**
   * Bank account for loan disbursement. The account number is
   * displayed to the customer masked (last 4 digits only) — see
   * `CustomerProfileResponseDto` — but is stored in full here (unlike
   * Aadhaar) since disbursement genuinely needs the real number.
   */
  @Column({ type: 'varchar', length: 34, nullable: true })
  bankAccountNumber?: string | null;

  @Column({ type: 'varchar', length: 11, nullable: true })
  bankIfscCode?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankAccountHolderName?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  nomineeName?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nomineeRelationship?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  nomineePhone?: string | null;

  /**
   * Full loan-application-wizard fields (Customer App production
   * sprint, Phase 1) — kept here, not on `LoanApplicationEntity`,
   * because they're facts about the person rather than one specific
   * application, matching the existing address/employment/income/
   * bank/nominee fields above: filled in once, reused (and editable)
   * across every application, not re-asked per submission.
   */
  @Column({ type: 'varchar', length: 16, nullable: true })
  gender?: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  maritalStatus?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  fatherName?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  motherName?: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  residenceType?: string | null;

  @Column({ type: 'int', nullable: true })
  yearsAtCurrentAddress?: number | null;

  /**
   * A single free-text permanent address — unlike the current address
   * above, this isn't decomposed into line/city/state/postal because
   * the form only ever needs it as one declared line, not a
   * disbursement-relevant structured address.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  permanentAddress?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  designation?: string | null;

  @Column({ type: 'date', nullable: true })
  joiningDate?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  officeAddress?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  officePhone?: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  additionalIncome?: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  currentMonthlyEmi?: string | null;

  @Column({ type: 'int', nullable: true })
  creditCardCount?: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  creditCardOutstanding?: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  existingLoansOutstanding?: string | null;

  /**
   * Balance Transfer signal — the customer self-declares an active
   * personal loan with a *different* lender they'd consider
   * transferring. This is the only data `LoanJourneyDetectionService`
   * has to work with for `BALANCE_TRANSFER`/`BT_TOPUP` detection;
   * without it, those two request types could never be reached. Kept
   * on the profile (not the application) since it's a fact about the
   * customer, not any one application.
   */
  @Column({ type: 'boolean', nullable: true })
  hasActiveExternalLoan?: boolean | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  externalLoanLenderName?: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  externalLoanOutstandingAmount?: string | null;

  /** Masked identifier only — see the AddBalanceTransferFields migration for why. */
  @Column({ type: 'varchar', length: 4, nullable: true })
  externalLoanAccountLast4?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  reference1Name?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  reference1Phone?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  reference1Relationship?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  reference2Name?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  reference2Phone?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  reference2Relationship?: string | null;
}
