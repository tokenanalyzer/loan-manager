import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddBalanceTransferFields — the minimum data needed for
 * `LoanJourneyDetectionService` to ever detect `BALANCE_TRANSFER` /
 * `BT_TOPUP` for a Personal Loan application. Without these columns,
 * automatic journey detection could structurally never return anything
 * but `FRESH_LOAN` or `TOP_UP` — there'd be nowhere for "I have an
 * existing loan elsewhere" to be recorded. See the Customer App's
 * profile-edit "Existing obligations" section, which is what populates
 * these.
 *
 * `externalLoanAccountLast4` (not the full account/loan number) mirrors
 * `aadhaarLast4`'s existing masked-identifier pattern on this same
 * table — enough to identify the loan during manual review, without
 * storing a full account number we have no product need for yet.
 */
export class AddBalanceTransferFields1783773700000 implements MigrationInterface {
  name = 'AddBalanceTransferFields1783773700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        ADD COLUMN "has_active_external_loan" boolean,
        ADD COLUMN "external_loan_lender_name" varchar(128),
        ADD COLUMN "external_loan_outstanding_amount" numeric(14,2),
        ADD COLUMN "external_loan_account_last4" varchar(4)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        DROP COLUMN "has_active_external_loan",
        DROP COLUMN "external_loan_lender_name",
        DROP COLUMN "external_loan_outstanding_amount",
        DROP COLUMN "external_loan_account_last4"
    `);
  }
}
