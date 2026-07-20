import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddLoanApplicationWaitingForCustomer — standard verification lifecycle
 * (Sprint 1, Item 4). A document-level `reupload_requested` status
 * surfaces on the owning application as a secondary, independent flag
 * — never a change to `status` itself (the loan pipeline and document
 * pipeline stay decoupled; see LoanApplicationsService.setWaitingForCustomer).
 * `waiting_for_customer_since` is nullable and only set while the flag
 * is true, giving staff a "how long has this been waiting" signal.
 */
export class AddLoanApplicationWaitingForCustomer1783773300000 implements MigrationInterface {
  name = 'AddLoanApplicationWaitingForCustomer1783773300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        ADD COLUMN "waiting_for_customer" boolean NOT NULL DEFAULT false,
        ADD COLUMN "waiting_for_customer_since" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        DROP COLUMN "waiting_for_customer",
        DROP COLUMN "waiting_for_customer_since"
    `);
  }
}
