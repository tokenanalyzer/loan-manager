import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddKycFieldsAndDocumentTypes — India-localization pass.
 *
 * Replaces `customer_profiles.national_id_number` (a vague, unvalidated
 * placeholder — see that entity's Phase 3 doc comment) with a proper
 * PAN + Aadhaar KYC model: `pan_number`, `aadhaar_last_4`,
 * `aadhaar_hash` (salted hash — the raw Aadhaar number is never
 * stored), a `kyc_status` workflow enum, and reviewer/reason/timestamp
 * columns mirroring the existing `loan_applications` review pattern.
 *
 * Also adds `pan_card`/`aadhaar_card` to `document_type_enum`, so the
 * Documents feature can require them as upload types alongside the
 * existing income/address proof.
 */
export class AddKycFieldsAndDocumentTypes1783771800000 implements MigrationInterface {
  name = 'AddKycFieldsAndDocumentTypes1783771800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "kyc_status_enum" AS ENUM ('not_submitted', 'pending_review', 'verified', 'rejected')
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        RENAME COLUMN "national_id_number" TO "pan_number"
    `);
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        ALTER COLUMN "pan_number" TYPE varchar(10)
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        ADD COLUMN "aadhaar_last_4" varchar(4),
        ADD COLUMN "aadhaar_hash" varchar(128),
        ADD COLUMN "kyc_status" "kyc_status_enum" NOT NULL DEFAULT 'not_submitted',
        ADD COLUMN "kyc_rejection_reason" varchar(255),
        ADD COLUMN "kyc_reviewed_by_id" uuid,
        ADD COLUMN "kyc_reviewed_at" timestamptz,
        ADD CONSTRAINT "fk_customer_profiles_kyc_reviewer" FOREIGN KEY ("kyc_reviewed_by_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`ALTER TYPE "document_type_enum" ADD VALUE 'pan_card'`);
    await queryRunner.query(`ALTER TYPE "document_type_enum" ADD VALUE 'aadhaar_card'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: Postgres cannot remove values from an enum type; the
    // 'pan_card'/'aadhaar_card' additions to document_type_enum are
    // not reverted here (harmless to leave — no rows will use them
    // once this migration is rolled back).
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        DROP CONSTRAINT "fk_customer_profiles_kyc_reviewer",
        DROP COLUMN "kyc_reviewed_at",
        DROP COLUMN "kyc_reviewed_by_id",
        DROP COLUMN "kyc_rejection_reason",
        DROP COLUMN "kyc_status",
        DROP COLUMN "aadhaar_hash",
        DROP COLUMN "aadhaar_last_4"
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        ALTER COLUMN "pan_number" TYPE varchar(64)
    `);
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        RENAME COLUMN "pan_number" TO "national_id_number"
    `);

    await queryRunner.query(`DROP TYPE "kyc_status_enum"`);
  }
}
