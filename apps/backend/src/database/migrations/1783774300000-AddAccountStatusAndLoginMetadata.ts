import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddAccountStatusAndLoginMetadata — Admin Authentication Module,
 * Phase 3 (Disable/Archive/Restore lifecycle).
 *
 * Adds `account_status_enum` + `users.status` (coexists with the
 * existing `is_active` boolean — see `AccountStatus`'s doc comment in
 * entities/enums.ts for why), the current-state columns
 * (`status_reason`/`status_changed_at`/`status_changed_by_id`,
 * mirroring the existing `kyc_reviewed_*` pattern on
 * `customer_profiles`), and login-metadata columns
 * (`last_login_at`/`last_failed_login_at`/`last_login_ip`/
 * `last_device`).
 *
 * Backfill: every existing row defaults to `status = 'active'` via
 * the column default, except rows where `is_active = false` already
 * (none exist in this codebase's history yet, but handled correctly
 * regardless) — those are backfilled to `'disabled'`, the closest
 * honest characterization available since no prior data distinguishes
 * "disabled" from "archived".
 */
export class AddAccountStatusAndLoginMetadata1783774300000 implements MigrationInterface {
  name = 'AddAccountStatusAndLoginMetadata1783774300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "account_status_enum" AS ENUM ('active', 'disabled', 'archived')
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "status" "account_status_enum" NOT NULL DEFAULT 'active',
        ADD COLUMN "status_reason" varchar(500),
        ADD COLUMN "status_changed_at" timestamptz,
        ADD COLUMN "status_changed_by_id" uuid,
        ADD COLUMN "last_login_at" timestamptz,
        ADD COLUMN "last_failed_login_at" timestamptz,
        ADD COLUMN "last_login_ip" varchar(64),
        ADD COLUMN "last_device" varchar(512),
        ADD CONSTRAINT "fk_users_status_changed_by" FOREIGN KEY ("status_changed_by_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      UPDATE "users" SET "status" = 'disabled' WHERE "is_active" = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP CONSTRAINT "fk_users_status_changed_by",
        DROP COLUMN "last_device",
        DROP COLUMN "last_login_ip",
        DROP COLUMN "last_failed_login_at",
        DROP COLUMN "last_login_at",
        DROP COLUMN "status_changed_by_id",
        DROP COLUMN "status_changed_at",
        DROP COLUMN "status_reason",
        DROP COLUMN "status"
    `);
    await queryRunner.query(`DROP TYPE "account_status_enum"`);
  }
}
