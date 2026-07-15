import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CreateDocumentTypesCatalog — Customer App production sprint (Phase 2).
 *
 * Replaces the hardcoded `document_type_enum` (6 fixed values, every
 * new type requiring a migration) with a data-driven catalog table.
 * `document_types.code` is a free-form varchar primary key, not a
 * Postgres enum — adding a new document type going forward is an
 * `INSERT`, never a schema change. This is also the table a future
 * Admin Panel manages directly (toggle `is_active`, adjust
 * `is_required`/`max_uploads`/`applicable_loan_category_ids`) without
 * any backend code changes, since `DocumentsService` reads this table
 * at request time, not a compiled-in list.
 *
 * The 6 legacy codes are seeded with the *exact* string values the
 * old `document_type_enum` already uses (e.g. `pan_card`) so the
 * follow-up migration's backfill from `documents.document_type` is a
 * straight string match — zero data risk for already-uploaded files.
 */
export class CreateDocumentTypesCatalog1783772200000 implements MigrationInterface {
  name = 'CreateDocumentTypesCatalog1783772200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "document_category_enum" AS ENUM (
        'identity', 'income', 'employment', 'balance_transfer', 'loan_specific', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "document_types" (
        "code" varchar(64) PRIMARY KEY,
        "label" varchar(128) NOT NULL,
        "category" "document_category_enum" NOT NULL,
        "is_required" boolean NOT NULL DEFAULT false,
        "max_uploads" int NOT NULL DEFAULT 1,
        "applicable_loan_category_ids" text[],
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Legacy codes — identical string values to the old document_type_enum.
    await queryRunner.query(`
      INSERT INTO "document_types"
        ("code", "label", "category", "is_required", "max_uploads", "applicable_loan_category_ids", "sort_order")
      VALUES
        ('pan_card', 'PAN Card', 'identity', true, 1, NULL, 10),
        ('aadhaar_card', 'Aadhaar Card', 'identity', true, 1, NULL, 20),
        ('address_proof', 'Proof of Address', 'identity', true, 1, NULL, 30),
        ('id_proof', 'Other ID Proof', 'identity', false, 1, NULL, 40),
        ('income_proof', 'Proof of Income (general)', 'income', false, 1, NULL, 50),
        ('other', 'Other Document', 'other', false, 3, NULL, 900)
    `);

    // New codes — Income, Employment, Balance Transfer.
    await queryRunner.query(`
      INSERT INTO "document_types"
        ("code", "label", "category", "is_required", "max_uploads", "applicable_loan_category_ids", "sort_order")
      VALUES
        ('salary_slip', 'Salary Slip', 'income', true, 3, NULL, 60),
        ('bank_statement', 'Bank Statement (6/12 months)', 'income', true, 1, NULL, 70),
        ('employee_id', 'Employee ID', 'employment', true, 1, NULL, 100),
        ('offer_letter', 'Offer Letter', 'employment', false, 1, NULL, 110),
        ('existing_loan_statement', 'Existing Loan Statement', 'balance_transfer', false, 1, NULL, 200),
        ('foreclosure_letter', 'Foreclosure Letter', 'balance_transfer', false, 1, NULL, 210),
        ('sanction_letter', 'Sanction Letter', 'balance_transfer', false, 1, NULL, 220)
    `);

    // Loan-specific codes — tagged to one loan category each via
    // applicable_loan_category_ids (matches the ids in the Customer
    // App's kLoanCategories / the backend's LOAN_CATEGORY_BOUNDS).
    await queryRunner.query(`
      INSERT INTO "document_types"
        ("code", "label", "category", "is_required", "max_uploads", "applicable_loan_category_ids", "sort_order")
      VALUES
        ('property_papers', 'Property Papers', 'loan_specific', true, 1, ARRAY['home'], 300),
        ('agreement', 'Sale Agreement', 'loan_specific', true, 1, ARRAY['home'], 310),
        ('registry', 'Registry Document', 'loan_specific', true, 1, ARRAY['home'], 320),
        ('rc', 'RC (Registration Certificate)', 'loan_specific', true, 1, ARRAY['vehicle'], 400),
        ('insurance', 'Vehicle Insurance', 'loan_specific', true, 1, ARRAY['vehicle'], 410),
        ('gst', 'GST Certificate', 'loan_specific', true, 1, ARRAY['business'], 500),
        ('itr', 'ITR (Income Tax Return)', 'loan_specific', true, 1, ARRAY['business'], 510),
        ('balance_sheet', 'Balance Sheet', 'loan_specific', true, 1, ARRAY['business'], 520),
        ('gold_valuation', 'Gold Valuation Certificate', 'loan_specific', true, 1, ARRAY['gold'], 600)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "document_types"`);
    await queryRunner.query(`DROP TYPE "document_category_enum"`);
  }
}
