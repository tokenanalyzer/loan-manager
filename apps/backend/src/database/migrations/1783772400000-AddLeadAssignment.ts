import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddLeadAssignment — Lead Assignment module.
 *
 * Adds nullable `assigned_to_id`/`assigned_at` to `loan_applications`
 * (null = "Unassigned"), a `last_active_at` presence stamp on `users`
 * (updated on every synced authenticated request — see
 * `AuthService.syncFromFirebaseToken` — and used to show
 * Online/Offline status before assigning a lead), and a new
 * append-only `lead_assignment_history` table recording every
 * assign/reassign/transfer action (assigned by, assigned to, previous
 * employee, new employee, date & time).
 */
export class AddLeadAssignment1783772400000 implements MigrationInterface {
  name = 'AddLeadAssignment1783772400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        ADD COLUMN "assigned_to_id" uuid,
        ADD COLUMN "assigned_at" timestamptz
    `);
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        ADD CONSTRAINT "fk_loan_applications_assigned_to" FOREIGN KEY ("assigned_to_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_loan_applications_assigned_to" ON "loan_applications" ("assigned_to_id")`,
    );

    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "last_active_at" timestamptz`);

    await queryRunner.query(`
      CREATE TABLE "lead_assignment_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "loan_application_id" uuid NOT NULL,
        "previous_assignee_id" uuid,
        "new_assignee_id" uuid NOT NULL,
        "assigned_by_id" uuid,
        "action" varchar(32) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_lead_assignment_history_application" FOREIGN KEY ("loan_application_id")
          REFERENCES "loan_applications" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_lead_assignment_history_previous_assignee" FOREIGN KEY ("previous_assignee_id")
          REFERENCES "users" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_lead_assignment_history_new_assignee" FOREIGN KEY ("new_assignee_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_lead_assignment_history_assigned_by" FOREIGN KEY ("assigned_by_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_lead_assignment_history_application" ON "lead_assignment_history" ("loan_application_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "lead_assignment_history"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_active_at"`);
    await queryRunner.query(
      `ALTER TABLE "loan_applications" DROP CONSTRAINT "fk_loan_applications_assigned_to"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan_applications" DROP COLUMN "assigned_to_id", DROP COLUMN "assigned_at"`,
    );
  }
}
