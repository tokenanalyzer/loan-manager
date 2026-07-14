import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddLoanApplicationCategoryId — India-localization pass.
 *
 * Adds `category_id` to `loan_applications`, matching a
 * `LoanCategory.id` from the shared Flutter catalog
 * (`packages/shared-flutter/lib/src/models/loan_category.dart`).
 * Lets the backend validate amount/term against per-category bounds
 * (`LOAN_CATEGORY_BOUNDS`) instead of only the global safety-net
 * bounds, and lets staff review see which product a customer applied
 * for. Nullable — existing applications and any submission without a
 * category fall back to the global bounds.
 */
export class AddLoanApplicationCategoryId1783771700000 implements MigrationInterface {
  name = 'AddLoanApplicationCategoryId1783771700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_applications"
        ADD COLUMN "category_id" varchar(64)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "loan_applications" DROP COLUMN "category_id"`);
  }
}
