import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddInternalNotesToLoanApplications — Employee Workspace.
 *
 * A single evolving free-text note per lead, private to the assigned
 * employee (never shown to the customer) — backs the workspace's
 * "Internal Notes" / autosave feature.
 */
export class AddInternalNotesToLoanApplications1783772600000 implements MigrationInterface {
  name = 'AddInternalNotesToLoanApplications1783772600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        ADD COLUMN "internal_notes" text,
        ADD COLUMN "internal_notes_updated_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        DROP COLUMN "internal_notes",
        DROP COLUMN "internal_notes_updated_at"
    `);
  }
}
