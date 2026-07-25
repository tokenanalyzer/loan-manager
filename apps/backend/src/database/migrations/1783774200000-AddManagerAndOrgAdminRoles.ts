import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddManagerAndOrgAdminRoles — widens `user_role_enum` with the two
 * new tiers between EMPLOYEE and ADMIN (see UserRole in
 * ../entities/enums.ts for the naming rationale). Additive only: no
 * existing row's role changes, no existing enum value is touched.
 */
export class AddManagerAndOrgAdminRoles1783774200000 implements MigrationInterface {
  name = 'AddManagerAndOrgAdminRoles1783774200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'manager'`);
    await queryRunner.query(`ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'org_admin'`);
  }

  public async down(): Promise<void> {
    // Postgres has no DROP VALUE for enum types — removing one requires
    // recreating the type from scratch. Irreversible-in-practice, same
    // tradeoff as WidenDocumentVerificationStatus and other additive
    // migrations in this history; acceptable once these values are in
    // real use as staff roles.
  }
}
