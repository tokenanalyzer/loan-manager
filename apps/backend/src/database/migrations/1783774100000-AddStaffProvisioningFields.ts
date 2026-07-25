import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddStaffProvisioningFields — adds `invited_at`/`activated_at` to
 * `users`, the two fields the staff-account-provisioning flow needs
 * to safely distinguish a pre-provisioned, not-yet-signed-in-with
 * employee/admin row from a real customer account.
 *
 * `invitedAt` is set only by the provisioning flow (never by customer
 * self-signup) — it doubles as "was this row created through staff
 * provisioning" per the approved linking-safety rule. `activatedAt`
 * is set once, the first time that pre-provisioned account's
 * placeholder `firebaseUid` sentinel gets replaced by a real one (see
 * `AuthService.activateStaffInvite`). Both nullable; both untouched
 * by the existing customer sign-in path.
 */
export class AddStaffProvisioningFields1783774100000 implements MigrationInterface {
  name = 'AddStaffProvisioningFields1783774100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "invited_at" timestamptz
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "activated_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "activated_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "invited_at"
    `);
  }
}
