import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddCustomerEmployeeQueryWorkflow — Customer↔Employee "Raise Query"
 * workflow. Adds `query_raised` to the existing
 * `loan_application_status_enum` (PG 12+ allows `ADD VALUE` inside a
 * transaction, just not using it in the same one) and the columns
 * needed to record who raised a query, its message, when it was
 * raised/responded to, plus a persisted rejection reason.
 */
export class AddCustomerEmployeeQueryWorkflow1783772700000 implements MigrationInterface {
  name = 'AddCustomerEmployeeQueryWorkflow1783772700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "loan_application_status_enum" ADD VALUE IF NOT EXISTS 'query_raised'`,
    );

    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        ADD COLUMN "query_message" text,
        ADD COLUMN "query_raised_by_id" uuid,
        ADD COLUMN "query_raised_at" timestamptz,
        ADD COLUMN "query_responded_at" timestamptz,
        ADD COLUMN "rejection_reason" text
    `);
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        ADD CONSTRAINT "fk_loan_applications_query_raised_by" FOREIGN KEY ("query_raised_by_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "loan_applications" DROP CONSTRAINT "fk_loan_applications_query_raised_by"`,
    );
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        DROP COLUMN "query_message",
        DROP COLUMN "query_raised_by_id",
        DROP COLUMN "query_raised_at",
        DROP COLUMN "query_responded_at",
        DROP COLUMN "rejection_reason"
    `);
    // Postgres has no `DROP VALUE` for enum types — removing 'query_raised'
    // from loan_application_status_enum would require rebuilding the type
    // (rename, recreate, migrate column, drop old), which is unsafe to do
    // blindly in a down migration if any row already uses the value. Left
    // in place intentionally; harmless if unused.
  }
}
