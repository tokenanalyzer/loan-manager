import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddLoanDisbursementFields — schema support for the real disbursement
 * workflow (`LoanApplicationsService.disburse`): a bank transaction
 * reference proving the money genuinely moved, who performed the
 * disbursement, and optional remarks. `disbursed_at`/`maturity_date`
 * already existed (Phase 3 schema) but nothing ever wrote them until
 * this workflow shipped.
 */
export class AddLoanDisbursementFields1783773900000 implements MigrationInterface {
  name = 'AddLoanDisbursementFields1783773900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loans"
        ADD COLUMN "disbursement_reference" varchar(128),
        ADD COLUMN "disbursed_by_id" uuid,
        ADD COLUMN "disbursement_notes" text
    `);

    await queryRunner.query(`
      ALTER TABLE "loans"
        ADD CONSTRAINT "fk_loans_disbursed_by" FOREIGN KEY ("disbursed_by_id")
        REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "loans" DROP CONSTRAINT "fk_loans_disbursed_by"`);
    await queryRunner.query(`
      ALTER TABLE "loans"
        DROP COLUMN "disbursement_reference",
        DROP COLUMN "disbursed_by_id",
        DROP COLUMN "disbursement_notes"
    `);
  }
}
