import { Column, Entity, Index, OneToOne, Unique } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import type { CustomerProfileEntity } from './customer-profile.entity';
import type { EmployeeProfileEntity } from './employee-profile.entity';
import { UserRole } from './enums';

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

  @OneToOne('CustomerProfileEntity', (profile: CustomerProfileEntity) => profile.user)
  customerProfile?: CustomerProfileEntity;

  @OneToOne('EmployeeProfileEntity', (profile: EmployeeProfileEntity) => profile.user)
  employeeProfile?: EmployeeProfileEntity;
}
