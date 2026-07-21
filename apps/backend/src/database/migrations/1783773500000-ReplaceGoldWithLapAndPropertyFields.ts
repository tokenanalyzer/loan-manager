import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ReplaceGoldWithLapAndPropertyFields — retires Gold Loan as a product
 * and replaces it with Loan Against Property (LAP), reusing Gold's
 * category-id slot (`'gold'` → `'lap'`) everywhere it was referenced.
 *
 * Confirmed before writing this migration: zero existing
 * `loan_applications` rows use `category_id = 'gold'` in this
 * database, so the id rename is a clean cutover with no orphaned data.
 *
 * Two things happen here:
 *  1. `loan_applications` gains 6 nullable columns for LAP's
 *     property-collateral facts (application-specific, not part of
 *     `CustomerProfile`).
 *  2. `document_types` catalog rows that referenced `'gold'` are
 *     updated to `'lap'` (`itr`/`salary_slip`'s `income_proof`
 *     OR-group membership), `gold_valuation` is deactivated (the
 *     product it was for no longer exists), and a new
 *     `property_documents` catalog row is added for LAP.
 */
export class ReplaceGoldWithLapAndPropertyFields1783773500000 implements MigrationInterface {
  name = 'ReplaceGoldWithLapAndPropertyFields1783773500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        ADD COLUMN "property_type" varchar(64),
        ADD COLUMN "property_ownership" varchar(64),
        ADD COLUMN "property_address" text,
        ADD COLUMN "property_value" numeric(14,2),
        ADD COLUMN "has_existing_loan_on_property" boolean,
        ADD COLUMN "existing_loan_outstanding_amount" numeric(14,2)
    `);

    await queryRunner.query(`
      UPDATE "document_types"
      SET "applicable_loan_category_ids" = ARRAY['personal','home','education','vehicle','lap']
      WHERE "code" = 'salary_slip'
    `);

    await queryRunner.query(`
      UPDATE "document_types"
      SET "applicable_loan_category_ids" = ARRAY['business','home','education','vehicle','lap']
      WHERE "code" = 'itr'
    `);

    await queryRunner.query(`
      UPDATE "document_types"
      SET "is_active" = false
      WHERE "code" = 'gold_valuation'
    `);

    await queryRunner.query(`
      INSERT INTO "document_types"
        ("code", "label", "category", "is_required", "max_uploads", "applicable_loan_category_ids", "sort_order")
      VALUES
        ('property_documents', 'Property Documents', 'loan_specific', true, 1, ARRAY['lap'], 305)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "document_types" WHERE "code" = 'property_documents'`);

    await queryRunner.query(`
      UPDATE "document_types" SET "is_active" = true WHERE "code" = 'gold_valuation'
    `);

    await queryRunner.query(`
      UPDATE "document_types"
      SET "applicable_loan_category_ids" = ARRAY['business','home','education','vehicle','gold']
      WHERE "code" = 'itr'
    `);

    await queryRunner.query(`
      UPDATE "document_types"
      SET "applicable_loan_category_ids" = ARRAY['personal','home','education','vehicle','gold']
      WHERE "code" = 'salary_slip'
    `);

    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        DROP COLUMN "property_type",
        DROP COLUMN "property_ownership",
        DROP COLUMN "property_address",
        DROP COLUMN "property_value",
        DROP COLUMN "has_existing_loan_on_property",
        DROP COLUMN "existing_loan_outstanding_amount"
    `);
  }
}
