import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * UpdateDocumentRequirementFlags — catalog data adjustment, requested
 * directly (no Admin Panel UI exists yet to make this change, and the
 * `document_types` table is owned by the app's runtime DB role, not
 * the `postgres` role available via Cloud SQL Studio — see checkpoint
 * docs). Applied as a migration so it runs with the correct role via
 * the existing deploy pipeline instead of requiring direct DB access.
 *
 * - `employee_id` (employment doc): no longer a hard requirement.
 * - `bank_statement` (income doc): confirmed hard requirement (was
 *   already `true` since the original catalog seed — restated here
 *   explicitly per the request, not a behavior change on its own).
 */
export class UpdateDocumentRequirementFlags1783774000000 implements MigrationInterface {
  name = 'UpdateDocumentRequirementFlags1783774000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "document_types" SET "is_required" = false WHERE "code" = 'employee_id'
    `);
    await queryRunner.query(`
      UPDATE "document_types" SET "is_required" = true WHERE "code" = 'bank_statement'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "document_types" SET "is_required" = true WHERE "code" = 'employee_id'
    `);
    await queryRunner.query(`
      UPDATE "document_types" SET "is_required" = true WHERE "code" = 'bank_statement'
    `);
  }
}
