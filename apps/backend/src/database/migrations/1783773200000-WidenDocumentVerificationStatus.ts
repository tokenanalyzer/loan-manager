import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WidenDocumentVerificationStatus — standard verification lifecycle
 * (Sprint 1, Item 4). Widens `documents.verification_status` from
 * varchar(16) to varchar(32) to fit the new `'reupload_requested'`
 * value (19 characters) — same varchar-with-app-level-validation style
 * as the column's original migration (`AddDocumentVerificationStatus`),
 * just wider.
 */
export class WidenDocumentVerificationStatus1783773200000 implements MigrationInterface {
  name = 'WidenDocumentVerificationStatus1783773200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "verification_status" TYPE varchar(32)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverting to varchar(16) will fail if any row already holds
    // 'reupload_requested' (19 chars) — expected/acceptable once this
    // value is in real use, same tradeoff as other irreversible-in-
    // practice migrations in this history (e.g. AddCustomerEmployeeQueryWorkflow).
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "verification_status" TYPE varchar(16)`,
    );
  }
}
