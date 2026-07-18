import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddWorkStatusAndBreaks — Employee Work Status & Break Management.
 *
 * Adds `current_status`/`current_status_since` to `employee_profiles`
 * (manually-set ONLINE/BUSY/break-type status; OFFLINE is derived
 * from `users.last_active_at`, never stored) and a new append-mostly
 * `employee_breaks` table that is both the "is this employee
 * currently on break" pointer (`ended_at IS NULL`) and the complete
 * audit history (break type, start/end time, duration, who ended it
 * and how — employee / admin / admin force-resume).
 */
export class AddWorkStatusAndBreaks1783772500000 implements MigrationInterface {
  name = 'AddWorkStatusAndBreaks1783772500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employee_profiles"
        ADD COLUMN "current_status" varchar(32) NOT NULL DEFAULT 'online',
        ADD COLUMN "current_status_since" timestamptz NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      CREATE TABLE "employee_breaks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "employee_id" uuid NOT NULL,
        "break_type" varchar(32) NOT NULL,
        "started_at" timestamptz NOT NULL,
        "ended_at" timestamptz,
        "end_reason" varchar(32),
        "ended_by_admin_id" uuid,
        "duration_seconds" int,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_employee_breaks_employee" FOREIGN KEY ("employee_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_employee_breaks_ended_by_admin" FOREIGN KEY ("ended_by_admin_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_employee_breaks_employee" ON "employee_breaks" ("employee_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "employee_breaks"`);
    await queryRunner.query(`
      ALTER TABLE "employee_profiles"
        DROP COLUMN "current_status",
        DROP COLUMN "current_status_since"
    `);
  }
}
