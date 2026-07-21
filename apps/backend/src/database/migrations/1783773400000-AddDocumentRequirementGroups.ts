import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddDocumentRequirementGroups — introduces OR-group requirements to the
 * document catalog (Customer App document-rules update).
 *
 * Until now every `document_types` row was independently `is_required`
 * — there was no way to express "any one of these satisfies the
 * requirement" (e.g. Salary Slip *or* ITR). `requirement_group_code`
 * adds that: rows sharing a code are alternatives of one requirement,
 * satisfied when any one of them is uploaded (verified, for the
 * approval gate). A category where only one member of a group applies
 * degenerates to a plain hard requirement with no special-casing.
 *
 * Seed adjustment for the `income_proof` group (`salary_slip`,
 * `bank_statement`, `itr`) encodes the new per-category rules purely
 * via `applicable_loan_category_ids`:
 *  - personal: salary_slip OR bank_statement (itr not applicable)
 *  - home / education / vehicle / gold: salary_slip OR itr
 *  - business: itr only (hard-required, single-member group)
 */
export class AddDocumentRequirementGroups1783773400000 implements MigrationInterface {
  name = 'AddDocumentRequirementGroups1783773400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "document_types" ADD COLUMN "requirement_group_code" varchar(64)
    `);

    await queryRunner.query(`
      UPDATE "document_types"
      SET "applicable_loan_category_ids" = ARRAY['personal','home','education','vehicle','gold'],
          "requirement_group_code" = 'income_proof'
      WHERE "code" = 'salary_slip'
    `);

    await queryRunner.query(`
      UPDATE "document_types"
      SET "applicable_loan_category_ids" = ARRAY['personal'],
          "requirement_group_code" = 'income_proof'
      WHERE "code" = 'bank_statement'
    `);

    await queryRunner.query(`
      UPDATE "document_types"
      SET "category" = 'income',
          "applicable_loan_category_ids" = ARRAY['business','home','education','vehicle','gold'],
          "requirement_group_code" = 'income_proof'
      WHERE "code" = 'itr'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "document_types"
      SET "applicable_loan_category_ids" = NULL,
          "requirement_group_code" = NULL
      WHERE "code" = 'salary_slip'
    `);

    await queryRunner.query(`
      UPDATE "document_types"
      SET "applicable_loan_category_ids" = NULL,
          "requirement_group_code" = NULL
      WHERE "code" = 'bank_statement'
    `);

    await queryRunner.query(`
      UPDATE "document_types"
      SET "category" = 'loan_specific',
          "applicable_loan_category_ids" = ARRAY['business'],
          "requirement_group_code" = NULL
      WHERE "code" = 'itr'
    `);

    await queryRunner.query(`
      ALTER TABLE "document_types" DROP COLUMN "requirement_group_code"
    `);
  }
}
