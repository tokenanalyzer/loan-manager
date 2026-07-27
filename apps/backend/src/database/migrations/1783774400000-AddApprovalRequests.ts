import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddApprovalRequests — Admin Authentication Module, Phase 5
 * (maker-checker dual-approval workflow for Disable/Archive/Restore).
 *
 * `action` is a free-text varchar, deliberately not a Postgres enum —
 * see `ApprovalRequestEntity`'s doc comment: new action types (future
 * Role Change / Delete User / Permission Change) must be addable
 * without a schema migration. `status` is a real enum: it's a small,
 * closed state machine specific to this table.
 *
 * The partial unique index enforces "at most one pending request per
 * (target, action)" at the database level — the app-level check in
 * `ApprovalsService.createRequest` is the primary UX gate; this is the
 * concurrency backstop.
 */
export class AddApprovalRequests1783774400000 implements MigrationInterface {
  name = 'AddApprovalRequests1783774400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "approval_request_status_enum" AS ENUM ('pending', 'approved', 'rejected', 'withdrawn', 'failed')
    `);

    await queryRunner.query(`
      CREATE TABLE "approval_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "action" varchar(64) NOT NULL,
        "target_user_id" uuid,
        "maker_id" uuid,
        "checker_id" uuid,
        "status" "approval_request_status_enum" NOT NULL DEFAULT 'pending',
        "payload" jsonb,
        "decision_note" varchar(500),
        "failure_reason" varchar(500),
        "decided_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "fk_approval_requests_target_user" FOREIGN KEY ("target_user_id")
          REFERENCES "users" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_approval_requests_maker" FOREIGN KEY ("maker_id")
          REFERENCES "users" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_approval_requests_checker" FOREIGN KEY ("checker_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_approval_requests_target_status" ON "approval_requests" ("target_user_id", "status")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_approval_requests_status" ON "approval_requests" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_approval_requests_maker" ON "approval_requests" ("maker_id")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_approval_requests_pending_target_action"
        ON "approval_requests" ("target_user_id", "action") WHERE "status" = 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "approval_requests"`);
    await queryRunner.query(`DROP TYPE "approval_request_status_enum"`);
  }
}
