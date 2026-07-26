import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, Unique } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import type { CustomerProfileEntity } from './customer-profile.entity';
import type { EmployeeProfileEntity } from './employee-profile.entity';
import { AccountStatus, UserRole } from './enums';

/**
 * UserEntity — shared identity record for every person in the system
 * (customer, employee, or admin), keyed to Firebase Authentication via
 * `firebaseUid`.
 *
 * Phase 3 scope: schema only. No authentication, login, OTP, or
 * authorization logic is implemented here — `firebaseUid` and `role`
 * are plain columns, not enforcement.
 */
@Entity('users')
@Unique('uq_users_firebase_uid', ['firebaseUid'])
@Unique('uq_users_email', ['email'])
export class UserEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 128 })
  firebaseUid!: string;

  /**
   * Nullable: Customer App sign-in is phone/OTP-based and frequently
   * has no email at all. Still unique when present (see the
   * AlterUsersRelaxRequiredProfileFields migration for why this
   * wasn't NOT NULL from the start).
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  /** Nullable for the same reason as `email` — see above. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName?: string | null;

  /**
   * From Firebase's decoded `picture` claim — present for
   * Google-authenticated users, absent for phone-authenticated ones.
   * A remote URL (Google's own CDN), not a file we store ourselves.
   */
  @Column({ type: 'varchar', length: 1024, nullable: true })
  photoUrl?: string | null;

  @Index('idx_users_role')
  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** Phase 6: set by the account-deletion-request endpoint; see the
   *  AddConsentAndDeletionRequestFields migration for why this is a
   *  request marker only, not an automated hard-delete trigger. */
  @Column({ type: 'timestamptz', nullable: true })
  deletionRequestedAt?: Date | null;

  /** Stamped on every synced authenticated request (see AuthService.syncFromFirebaseToken) — powers the Lead Assignment module's Online/Offline presence indicator. */
  @Column({ type: 'timestamptz', nullable: true })
  lastActiveAt?: Date | null;

  /**
   * Set only by the staff-provisioning flow (`UsersService.createStaffUser`)
   * — never by customer self-signup. Doubles as the "was this row
   * created through staff provisioning" signal in
   * `AuthService`'s pending-invite linking check.
   */
  @Column({ type: 'timestamptz', nullable: true })
  invitedAt?: Date | null;

  /**
   * Set exactly once, when a pre-provisioned account's placeholder
   * `firebaseUid` sentinel is replaced by a real one on first sign-in
   * (see `AuthService.activateStaffInvite`). Null means "never
   * completed first-time activation" — one of the required conditions
   * before that row can ever be linked.
   */
  @Column({ type: 'timestamptz', nullable: true })
  activatedAt?: Date | null;

  /**
   * Team Management lifecycle state (Phase 3) — see `AccountStatus`'s
   * doc comment for why this coexists with `isActive` rather than
   * replacing it. Written only by `UsersService`'s
   * disable/archive/restore methods.
   */
  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.ACTIVE })
  status!: AccountStatus;

  /** Mandatory reason captured on Disable/Archive; cleared back to null on Restore. History of every past reason lives in `audit_logs`, not here — this is "why is the account *currently* in this state." */
  @Column({ type: 'varchar', length: 500, nullable: true })
  statusReason?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  statusChangedAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  statusChangedById?: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'status_changed_by_id', foreignKeyConstraintName: 'fk_users_status_changed_by' })
  statusChangedBy?: UserEntity | null;

  /** Stamped by `AuthService.recordSuccessfulLogin`, called once per fresh session (`POST /v1/auth/session`) — distinct from `lastActiveAt`, which is stamped on every authenticated request for presence tracking. */
  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;

  /** Stamped by `SyncUserGuard` when a still-valid Firebase token belongs to a disabled/archived account — a login attempt blocked by account status, not a bad password (Firebase owns password verification; we never see that failure). */
  @Column({ type: 'timestamptz', nullable: true })
  lastFailedLoginAt?: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lastLoginIp?: string | null;

  /** Raw `User-Agent` header from the most recent successful login — "future-ready" placeholder for real device identification, not parsed/normalized yet. */
  @Column({ type: 'varchar', length: 512, nullable: true })
  lastDevice?: string | null;

  @OneToOne('CustomerProfileEntity', (profile: CustomerProfileEntity) => profile.user)
  customerProfile?: CustomerProfileEntity;

  @OneToOne('EmployeeProfileEntity', (profile: EmployeeProfileEntity) => profile.user)
  employeeProfile?: EmployeeProfileEntity;
}
