import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddBankAccountAndNomineeFields — Customer App production pass.
 *
 * Adds bank-account-for-disbursement and nominee details to
 * `customer_profiles`, backing the Profile screen's "Bank Account" and
 * "Nominee" sections. Unlike Aadhaar, the bank account number is
 * stored in full (disbursement genuinely needs it) — only masked in
 * API responses/UI (last 4 digits), not hashed.
 */
export class AddBankAccountAndNomineeFields1783772000000 implements MigrationInterface {
  name = 'AddBankAccountAndNomineeFields1783772000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        ADD COLUMN "bank_account_number" varchar(34),
        ADD COLUMN "bank_ifsc_code" varchar(11),
        ADD COLUMN "bank_account_holder_name" varchar(255),
        ADD COLUMN "nominee_name" varchar(128),
        ADD COLUMN "nominee_relationship" varchar(64)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        DROP COLUMN "bank_account_number",
        DROP COLUMN "bank_ifsc_code",
        DROP COLUMN "bank_account_holder_name",
        DROP COLUMN "nominee_name",
        DROP COLUMN "nominee_relationship"
    `);
  }
}
