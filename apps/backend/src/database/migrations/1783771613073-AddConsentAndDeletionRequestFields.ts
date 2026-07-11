import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddConsentAndDeletionRequestFields — Phase 6 additive migration.
 *
 * Adds consent/privacy fields to `customer_profiles` and an
 * account-deletion request timestamp to `users`. Additive to
 * *existing* tables (not a new module) — backs the Customer App's
 * Privacy Settings and Account Deletion Request screens.
 *
 * `deletion_requested_at` is a *request* marker only — no automated
 * hard-delete job reads it yet (that would need real safeguards for
 * a financial/loan customer record). Actioning the request remains a
 * manual/future process.
 */
export class AddConsentAndDeletionRequestFields1783771613073 implements MigrationInterface {
  name = 'AddConsentAndDeletionRequestFields1783771613073';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        ADD COLUMN "marketing_consent" boolean NOT NULL DEFAULT false,
        ADD COLUMN "data_consent_accepted_at" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "deletion_requested_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deletion_requested_at"`);
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        DROP COLUMN "marketing_consent",
        DROP COLUMN "data_consent_accepted_at"
    `);
  }
}
