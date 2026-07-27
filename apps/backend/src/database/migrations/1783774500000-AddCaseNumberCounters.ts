import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddCaseNumberCounters — Case Number (permanent Business ID) support.
 *
 * One row per calendar year, tracking the last-issued sequence number
 * for that year. `case_number` itself is added to `loan_applications`
 * in the next migration (`AddCaseNumberToLoanApplications`), which
 * also seeds this table from existing data — split into two migrations
 * so the counter table exists before the backfill needs to write to it.
 */
export class AddCaseNumberCounters1783774500000 implements MigrationInterface {
  name = 'AddCaseNumberCounters1783774500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "case_number_counters" (
        "year" integer PRIMARY KEY,
        "last_value" integer NOT NULL DEFAULT 0
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "case_number_counters"`);
  }
}
