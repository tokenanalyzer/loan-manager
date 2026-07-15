import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ExtendDocumentsForCatalog — Customer App production sprint (Phase 2).
 *
 * Wires `documents` to the new `document_types` catalog and adds
 * multi-slot support (e.g. three `salary_slip` rows per owner, one
 * per slot — "Salary Slip 1/2/3"). `document_type_code` is backfilled
 * from the existing `document_type` enum column, which uses the exact
 * same string values as the 6 legacy `document_types` codes — a
 * straight cast, no data transformation, so every already-uploaded
 * document keeps working unchanged. The old `document_type` column is
 * left in place (kept NOT NULL/defaulted) purely as a legacy
 * compatibility artifact; nothing in the codebase reads it going
 * forward (confirmed via full-repo grep before this migration was
 * written) — `document_type_code` is the new source of truth.
 */
export class ExtendDocumentsForCatalog1783772300000 implements MigrationInterface {
  name = 'ExtendDocumentsForCatalog1783772300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN "document_type_code" varchar(64),
        ADD COLUMN "slot_index" int NOT NULL DEFAULT 1,
        ADD COLUMN "label" varchar(128)
    `);

    // Backfill: the 6 legacy enum values are identical strings to the
    // seeded document_types codes (see CreateDocumentTypesCatalog).
    await queryRunner.query(`
      UPDATE "documents" SET "document_type_code" = "document_type"::text
    `);

    await queryRunner.query(`
      ALTER TABLE "documents"
        ALTER COLUMN "document_type_code" SET NOT NULL,
        ADD CONSTRAINT "fk_documents_type" FOREIGN KEY ("document_type_code")
          REFERENCES "document_types" ("code") ON DELETE RESTRICT,
        ADD CONSTRAINT "uq_documents_owner_type_slot" UNIQUE ("owner_id", "document_type_code", "slot_index")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP CONSTRAINT "uq_documents_owner_type_slot",
        DROP CONSTRAINT "fk_documents_type",
        DROP COLUMN "label",
        DROP COLUMN "slot_index",
        DROP COLUMN "document_type_code"
    `);
  }
}
