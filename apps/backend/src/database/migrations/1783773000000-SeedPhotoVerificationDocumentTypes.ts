import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SeedPhotoVerificationDocumentTypes — DB prep for the future Photo
 * Verification feature (Sprint 2). Reuses the existing `document_types`
 * catalog plus the `documents` upload/verify/audit/notify machinery
 * instead of a dedicated new table — Passport Photo and Selfie become two
 * more catalog rows, going through the exact same verification lifecycle
 * as every other document. Must run after AddPhotoDocumentCategory
 * (separate migration, separate transaction).
 */
export class SeedPhotoVerificationDocumentTypes1783773000000 implements MigrationInterface {
  name = 'SeedPhotoVerificationDocumentTypes1783773000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "document_types"
        ("code", "label", "category", "is_required", "max_uploads", "applicable_loan_category_ids", "sort_order")
      VALUES
        ('passport_photo', 'Passport Photo', 'photo', true, 1, NULL, 700),
        ('selfie', 'Live Selfie', 'photo', true, 1, NULL, 710)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "document_types" WHERE "code" IN ('passport_photo', 'selfie')`);
  }
}
