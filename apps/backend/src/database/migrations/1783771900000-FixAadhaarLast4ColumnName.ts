import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FixAadhaarLast4ColumnName — corrects a column-naming bug from
 * `AddKycFieldsAndDocumentTypes`.
 *
 * That migration created `customer_profiles.aadhaar_last_4`, but
 * TypeORM's `SnakeNamingStrategy` maps the `aadhaarLast4` entity
 * property to `aadhaar_last4` (no underscore before a trailing digit)
 * — confirmed at runtime: `column CustomerProfileEntity.aadhaar_last4
 * does not exist`. Renaming here rather than editing the already-run
 * migration, so migration history stays accurate for any environment
 * that already applied it.
 */
export class FixAadhaarLast4ColumnName1783771900000 implements MigrationInterface {
  name = 'FixAadhaarLast4ColumnName1783771900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        RENAME COLUMN "aadhaar_last_4" TO "aadhaar_last4"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
        RENAME COLUMN "aadhaar_last4" TO "aadhaar_last_4"
    `);
  }
}
