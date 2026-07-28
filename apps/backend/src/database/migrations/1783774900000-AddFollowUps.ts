import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddFollowUps — Employee CRM: the one new concept covering Tasks/
 * Follow-ups/Reminders/Call Notes at once. See `FollowUpStatus`'s doc
 * comment on `FollowUpEntity` for why. No backfill needed — this is a
 * brand-new feature, no prior data to migrate.
 */
export class AddFollowUps1783774900000 implements MigrationInterface {
  name = 'AddFollowUps1783774900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "follow_ups_status_enum" AS ENUM ('pending', 'done', 'cancelled')`);

    await queryRunner.query(`
      CREATE TABLE "follow_ups" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "loan_application_id" uuid NOT NULL,
        "created_by_id" uuid,
        "assigned_to_id" uuid NOT NULL,
        "note" text NOT NULL,
        "due_at" timestamptz NOT NULL,
        "status" "follow_ups_status_enum" NOT NULL DEFAULT 'pending',
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "fk_follow_ups_loan_application" FOREIGN KEY ("loan_application_id")
          REFERENCES "loan_applications" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_follow_ups_created_by" FOREIGN KEY ("created_by_id")
          REFERENCES "users" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_follow_ups_assigned_to" FOREIGN KEY ("assigned_to_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_follow_ups_loan_application" ON "follow_ups" ("loan_application_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_follow_ups_assigned_to" ON "follow_ups" ("assigned_to_id")`);
    await queryRunner.query(`CREATE INDEX "idx_follow_ups_due_at" ON "follow_ups" ("due_at")`);
    await queryRunner.query(`CREATE INDEX "idx_follow_ups_status" ON "follow_ups" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "follow_ups"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_ups_status_enum"`);
  }
}
