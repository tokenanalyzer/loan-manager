import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddPhotoDocumentCategory — DB prep for the future Photo Verification
 * feature (Sprint 2). Adds `photo` to the existing `document_category_enum`
 * only. The actual PASSPORT_PHOTO/SELFIE catalog rows are seeded by a
 * separate, later migration (SeedPhotoVerificationDocumentTypes) — Postgres
 * cannot use a newly added enum value in the same transaction that adds it,
 * same constraint noted in AddCustomerEmployeeQueryWorkflow.
 */
export class AddPhotoDocumentCategory1783772900000 implements MigrationInterface {
  name = 'AddPhotoDocumentCategory1783772900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "document_category_enum" ADD VALUE IF NOT EXISTS 'photo'`);
  }

  public async down(): Promise<void> {
    // Postgres has no `DROP VALUE` for enum types — removing 'photo' would
    // require rebuilding the type, unsafe to do blindly in a down migration
    // if any row already uses it. Left in place intentionally; harmless if
    // unused (same approach as AddCustomerEmployeeQueryWorkflow's down()).
  }
}
