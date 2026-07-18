import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddDocumentVerificationStatus — Document Management Center. Adds
 * staff verification (pending/verified/rejected), independent of the
 * customer-level KYC status, to every uploaded document.
 */
export class AddDocumentVerificationStatus1783772800000 implements MigrationInterface {
  name = 'AddDocumentVerificationStatus1783772800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN "verification_status" varchar(16) NOT NULL DEFAULT 'pending',
        ADD COLUMN "verification_note" text,
        ADD COLUMN "verified_by_id" uuid,
        ADD COLUMN "verified_at" timestamptz
    `);
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD CONSTRAINT "fk_documents_verified_by" FOREIGN KEY ("verified_by_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "fk_documents_verified_by"`);
    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP COLUMN "verification_status",
        DROP COLUMN "verification_note",
        DROP COLUMN "verified_by_id",
        DROP COLUMN "verified_at"
    `);
  }
}
