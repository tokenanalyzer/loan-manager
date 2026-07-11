import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AlterUsersRelaxRequiredProfileFields — relaxes `users.email` and
 * `users.full_name` from NOT NULL to nullable.
 *
 * Why (added in Phase 4, not by editing the Phase 3 migration): the
 * Customer App uses Firebase Phone Authentication, which frequently
 * provides neither an email address nor a display name. The Phase 3
 * schema assumed every user would have both at creation time, which
 * doesn't hold once phone-only sign-up is implemented. Rather than
 * rewriting an already-committed migration, schema evolution happens
 * via a new, additive migration — the normal, safe pattern once a
 * migration has shipped.
 *
 * `email` keeps its UNIQUE constraint — Postgres permits multiple NULLs
 * under a UNIQUE constraint, so this doesn't weaken that guarantee for
 * users who do have an email.
 *
 * No business logic changes here — schema only. Populating these
 * fields via a real profile-completion flow is future work.
 */
export class AlterUsersRelaxRequiredProfileFields1783769475535 implements MigrationInterface {
  name = 'AlterUsersRelaxRequiredProfileFields1783769475535';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "full_name" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // NOTE: this will fail if any row has a NULL email/full_name by the
    // time this runs — expected/acceptable for a down-migration on a
    // constraint-tightening rollback; clean up data before reverting.
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
  }
}
