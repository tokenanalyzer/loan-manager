import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddDocumentVersions — Document Versioning: every uploaded document
 * becomes an immutable version row; `documents.current_version_id`
 * points at whichever is latest. Replacing a document no longer
 * deletes the old file or overwrites its row — see
 * `DocumentVersionEntity`'s doc comment and `DocumentsService.upload`.
 *
 * Backfill: every existing `documents` row becomes version 1 of
 * itself, copying its own file/verification data — so a document
 * uploaded before this migration has exactly the same "version
 * history" (one entry) as a document uploaded after it. Existing
 * `documents` columns are untouched (kept as a live mirror going
 * forward, not replaced) so every current reader keeps working
 * unchanged.
 */
export class AddDocumentVersions1783774700000 implements MigrationInterface {
  name = 'AddDocumentVersions1783774700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "document_versions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "document_id" uuid NOT NULL,
        "version_number" integer NOT NULL,
        "storage_path" varchar(512) NOT NULL,
        "original_file_name" varchar(255) NOT NULL,
        "mime_type" varchar(128),
        "file_size_bytes" bigint,
        "uploaded_at" timestamptz NOT NULL DEFAULT now(),
        "uploaded_by_id" uuid,
        "verification_status" varchar(32) NOT NULL DEFAULT 'pending',
        "verification_note" text,
        "verified_by_id" uuid,
        "verified_at" timestamptz,
        "superseded_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "fk_document_versions_document" FOREIGN KEY ("document_id")
          REFERENCES "documents" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_document_versions_uploaded_by" FOREIGN KEY ("uploaded_by_id")
          REFERENCES "users" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_document_versions_verified_by" FOREIGN KEY ("verified_by_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_document_versions_document" ON "document_versions" ("document_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_document_versions_document_version"
        ON "document_versions" ("document_id", "version_number")
    `);

    await queryRunner.query(`ALTER TABLE "documents" ADD COLUMN "current_version_id" uuid`);

    // Backfill: one version-1 row per existing document, copying its current data verbatim.
    await queryRunner.query(`
      INSERT INTO "document_versions" (
        "document_id", "version_number", "storage_path", "original_file_name", "mime_type",
        "file_size_bytes", "uploaded_at", "uploaded_by_id", "verification_status",
        "verification_note", "verified_by_id", "verified_at"
      )
      SELECT
        "id", 1, "storage_path", "original_file_name", "mime_type",
        "file_size_bytes", "uploaded_at", "owner_id", "verification_status",
        "verification_note", "verified_by_id", "verified_at"
      FROM "documents"
    `);

    await queryRunner.query(`
      UPDATE "documents" AS d
      SET "current_version_id" = dv."id"
      FROM "document_versions" AS dv
      WHERE dv."document_id" = d."id" AND dv."version_number" = 1
    `);

    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD CONSTRAINT "fk_documents_current_version" FOREIGN KEY ("current_version_id")
          REFERENCES "document_versions" ("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "fk_documents_current_version"`,
    );
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN IF EXISTS "current_version_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_versions"`);
  }
}
