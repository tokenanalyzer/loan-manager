import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * InitialSchema — creates every table in the Phase 3 domain model.
 *
 * Hand-written (not CLI-generated): this environment has no live
 * Postgres connection or network access to run
 * `typeorm migration:generate`, which needs to diff against an actual
 * database. The SQL below was written to match the entities in
 * `src/database/entities/` field-for-field (types, nullability,
 * defaults, and the snake_case naming strategy) and should be treated
 * as the first thing to verify against a real database — run
 * `pnpm migration:run` locally and confirm `flutter`/`nest` boot
 * cleanly against the resulting schema.
 *
 * No business logic lives here — only table/column/constraint/index
 * definitions.
 */
export class InitialSchema1783767718032 implements MigrationInterface {
  name = 'InitialSchema1783767718032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // UUID generation (gen_random_uuid) ships in Postgres 13+ via pgcrypto.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('customer', 'employee', 'admin')
    `);
    await queryRunner.query(`
      CREATE TYPE "loan_application_status_enum" AS ENUM
        ('submitted', 'under_review', 'approved', 'rejected', 'withdrawn')
    `);
    await queryRunner.query(`
      CREATE TYPE "loan_status_enum" AS ENUM
        ('pending', 'approved', 'rejected', 'active', 'closed', 'defaulted')
    `);
    await queryRunner.query(`
      CREATE TYPE "payment_status_enum" AS ENUM ('scheduled', 'paid', 'late', 'missed')
    `);
    await queryRunner.query(`
      CREATE TYPE "document_type_enum" AS ENUM
        ('id_proof', 'income_proof', 'address_proof', 'loan_agreement', 'other')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "firebase_uid" varchar(128) NOT NULL,
        "email" varchar(255) NOT NULL,
        "phone" varchar(32),
        "full_name" varchar(255) NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'customer',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "uq_users_firebase_uid" UNIQUE ("firebase_uid"),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_role" ON "users" ("role")`);

    await queryRunner.query(`
      CREATE TABLE "customer_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "date_of_birth" date,
        "national_id_number" varchar(64),
        "address_line1" varchar(255),
        "address_line2" varchar(255),
        "city" varchar(128),
        "state" varchar(128),
        "postal_code" varchar(32),
        "country" varchar(128),
        "employment_status" varchar(64),
        "monthly_income" numeric(14,2),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "uq_customer_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "fk_customer_profiles_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "employee_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "employee_code" varchar(64) NOT NULL,
        "department" varchar(128),
        "branch" varchar(128),
        "hire_date" date,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "uq_employee_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "uq_employee_profiles_employee_code" UNIQUE ("employee_code"),
        CONSTRAINT "fk_employee_profiles_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "loan_applications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "applicant_id" uuid NOT NULL,
        "reviewed_by_id" uuid,
        "requested_amount" numeric(14,2) NOT NULL,
        "requested_term_months" integer NOT NULL,
        "purpose" varchar(255),
        "status" "loan_application_status_enum" NOT NULL DEFAULT 'submitted',
        "submitted_at" timestamptz NOT NULL DEFAULT now(),
        "reviewed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "fk_loan_applications_applicant" FOREIGN KEY ("applicant_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_loan_applications_reviewer" FOREIGN KEY ("reviewed_by_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_loan_applications_applicant" ON "loan_applications" ("applicant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_loan_applications_status" ON "loan_applications" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "loans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "loan_number" varchar(64) NOT NULL,
        "application_id" uuid,
        "customer_id" uuid NOT NULL,
        "created_by_id" uuid,
        "principal_amount" numeric(14,2) NOT NULL,
        "interest_rate" numeric(6,3) NOT NULL,
        "term_months" integer NOT NULL,
        "status" "loan_status_enum" NOT NULL DEFAULT 'pending',
        "disbursed_at" timestamptz,
        "maturity_date" date,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "uq_loans_loan_number" UNIQUE ("loan_number"),
        CONSTRAINT "uq_loans_application_id" UNIQUE ("application_id"),
        CONSTRAINT "fk_loans_application" FOREIGN KEY ("application_id")
          REFERENCES "loan_applications" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_loans_customer" FOREIGN KEY ("customer_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_loans_created_by" FOREIGN KEY ("created_by_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_loans_customer" ON "loans" ("customer_id")`);
    await queryRunner.query(`CREATE INDEX "idx_loans_status" ON "loans" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "loan_id" uuid NOT NULL,
        "amount_due" numeric(14,2) NOT NULL,
        "amount_paid" numeric(14,2) NOT NULL DEFAULT 0,
        "due_date" date NOT NULL,
        "paid_at" timestamptz,
        "status" "payment_status_enum" NOT NULL DEFAULT 'scheduled',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "fk_payments_loan" FOREIGN KEY ("loan_id")
          REFERENCES "loans" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_payments_loan" ON "payments" ("loan_id")`);
    await queryRunner.query(`CREATE INDEX "idx_payments_status" ON "payments" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL,
        "loan_application_id" uuid,
        "loan_id" uuid,
        "document_type" "document_type_enum" NOT NULL DEFAULT 'other',
        "storage_path" varchar(512) NOT NULL,
        "original_file_name" varchar(255) NOT NULL,
        "mime_type" varchar(128),
        "file_size_bytes" bigint,
        "uploaded_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "fk_documents_owner" FOREIGN KEY ("owner_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_documents_loan_application" FOREIGN KEY ("loan_application_id")
          REFERENCES "loan_applications" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_documents_loan" FOREIGN KEY ("loan_id")
          REFERENCES "loans" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_documents_owner" ON "documents" ("owner_id")`);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_id" uuid,
        "action" varchar(128) NOT NULL,
        "entity_name" varchar(128) NOT NULL,
        "entity_id" varchar(128),
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_audit_logs_actor" FOREIGN KEY ("actor_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" ("entity_name", "entity_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse strict dependency order (children before parents).
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loan_applications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "employee_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "document_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "loan_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "loan_application_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
