import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ExtendCustomerProfileForApplicationForm — Customer App production
 * sprint (Phase 1).
 *
 * Adds the personal/address/employment/existing-obligation/reference
 * fields the full loan-application wizard needs, following the exact
 * pattern of `AddKycFieldsAndDocumentTypes`/`AddBankAccountAndNomineeFields`:
 * one additive, all-nullable batch on `customer_profiles`, reusing the
 * existing entity/DTO/service/controller — no new tables, no new
 * endpoints. See `docs/architecture-review-2026-07.md`-style reasoning
 * in the sprint plan for why these are profile-level (reusable across
 * applications, same as the existing address/employment/income/bank/
 * nominee fields) rather than a new per-application table.
 */
export class ExtendCustomerProfileForApplicationForm1783772100000 implements MigrationInterface {
  name = 'ExtendCustomerProfileForApplicationForm1783772100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        ADD COLUMN "gender" varchar(16),
        ADD COLUMN "marital_status" varchar(24),
        ADD COLUMN "father_name" varchar(128),
        ADD COLUMN "mother_name" varchar(128),
        ADD COLUMN "residence_type" varchar(24),
        ADD COLUMN "years_at_current_address" int,
        ADD COLUMN "permanent_address" varchar(255),
        ADD COLUMN "company_name" varchar(255),
        ADD COLUMN "designation" varchar(128),
        ADD COLUMN "joining_date" date,
        ADD COLUMN "office_address" varchar(255),
        ADD COLUMN "office_phone" varchar(20),
        ADD COLUMN "additional_income" numeric(14, 2),
        ADD COLUMN "current_monthly_emi" numeric(14, 2),
        ADD COLUMN "credit_card_count" int,
        ADD COLUMN "credit_card_outstanding" numeric(14, 2),
        ADD COLUMN "existing_loans_outstanding" numeric(14, 2),
        ADD COLUMN "nominee_phone" varchar(20),
        ADD COLUMN "reference1_name" varchar(128),
        ADD COLUMN "reference1_phone" varchar(20),
        ADD COLUMN "reference1_relationship" varchar(64),
        ADD COLUMN "reference2_name" varchar(128),
        ADD COLUMN "reference2_phone" varchar(20),
        ADD COLUMN "reference2_relationship" varchar(64)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        DROP COLUMN "gender",
        DROP COLUMN "marital_status",
        DROP COLUMN "father_name",
        DROP COLUMN "mother_name",
        DROP COLUMN "residence_type",
        DROP COLUMN "years_at_current_address",
        DROP COLUMN "permanent_address",
        DROP COLUMN "company_name",
        DROP COLUMN "designation",
        DROP COLUMN "joining_date",
        DROP COLUMN "office_address",
        DROP COLUMN "office_phone",
        DROP COLUMN "additional_income",
        DROP COLUMN "current_monthly_emi",
        DROP COLUMN "credit_card_count",
        DROP COLUMN "credit_card_outstanding",
        DROP COLUMN "existing_loans_outstanding",
        DROP COLUMN "nominee_phone",
        DROP COLUMN "reference1_name",
        DROP COLUMN "reference1_phone",
        DROP COLUMN "reference1_relationship",
        DROP COLUMN "reference2_name",
        DROP COLUMN "reference2_phone",
        DROP COLUMN "reference2_relationship"
    `);
  }
}
