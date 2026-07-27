import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddCaseNumberToLoanApplications — adds the permanent Business ID
 * column and backfills every pre-existing row, since the requirement
 * ("the permanent Business ID of every Loan Application") applies to
 * historical applications too, not just future submissions.
 *
 * Backfill assigns sequential numbers per calendar year, ordered by
 * `submitted_at` (ties broken by `id` for determinism), then seeds
 * `case_number_counters` (added in the prior migration) from the
 * backfilled counts so `CaseNumberService.generate` continues the
 * sequence correctly for the next live submission — no collision, no
 * artificial gap. On an empty table both the backfill `UPDATE` and the
 * counter-seed `INSERT` are no-ops.
 */
export class AddCaseNumberToLoanApplications1783774600000 implements MigrationInterface {
  name = 'AddCaseNumberToLoanApplications1783774600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "loan_applications" ADD COLUMN "case_number" varchar(20)`);

    await queryRunner.query(`
      UPDATE "loan_applications" AS la
      SET "case_number" = 'LM-' || sub.yr || '-' || LPAD(sub.rn::text, 6, '0')
      FROM (
        SELECT id,
               EXTRACT(YEAR FROM submitted_at)::int AS yr,
               ROW_NUMBER() OVER (
                 PARTITION BY EXTRACT(YEAR FROM submitted_at)
                 ORDER BY submitted_at ASC, id ASC
               ) AS rn
        FROM "loan_applications"
      ) AS sub
      WHERE la.id = sub.id
    `);

    await queryRunner.query(`ALTER TABLE "loan_applications" ALTER COLUMN "case_number" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        ADD CONSTRAINT "uq_loan_applications_case_number" UNIQUE ("case_number")
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_loan_applications_case_number" ON "loan_applications" ("case_number")`,
    );

    await queryRunner.query(`
      INSERT INTO "case_number_counters" ("year", "last_value")
      SELECT EXTRACT(YEAR FROM submitted_at)::int, COUNT(*)
      FROM "loan_applications"
      GROUP BY EXTRACT(YEAR FROM submitted_at)::int
      ON CONFLICT ("year") DO UPDATE SET "last_value" = EXCLUDED."last_value"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_loan_applications_case_number"`);
    await queryRunner.query(`
      ALTER TABLE "loan_applications" DROP CONSTRAINT IF EXISTS "uq_loan_applications_case_number"
    `);
    await queryRunner.query(`ALTER TABLE "loan_applications" DROP COLUMN IF EXISTS "case_number"`);
    // Counter rows seeded by this migration are intentionally left in place on
    // revert — deleting them would let a case number be reused if this
    // migration is later re-applied after new applications were submitted in
    // between, violating the "never reused" requirement. Harmless to leave.
  }
}
