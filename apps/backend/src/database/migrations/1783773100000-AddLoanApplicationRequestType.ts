import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddLoanApplicationRequestType — request-type reservation (MPS §7/§8,
 * Sprint 1). Adds `request_type` to `loan_applications`, varchar-with-
 * app-level-validation style (matching `verification_status`'s
 * precedent in AddDocumentVerificationStatus, not a native Postgres
 * enum) since this column is expected to grow — only `FRESH_LOAN` is
 * functional today; `TOP_UP`/`BALANCE_TRANSFER`/`BT_TOPUP`/`BT_FRESH`
 * are reserved ahead of the Customer Benefits module.
 */
export class AddLoanApplicationRequestType1783773100000 implements MigrationInterface {
  name = 'AddLoanApplicationRequestType1783773100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        ADD COLUMN "request_type" varchar(20) NOT NULL DEFAULT 'FRESH_LOAN'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "loan_applications" DROP COLUMN "request_type"`);
  }
}
