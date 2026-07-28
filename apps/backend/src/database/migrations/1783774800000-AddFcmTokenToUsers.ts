import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddFcmTokenToUsers — Push Notifications: a single device token per
 * user (matches the existing single-value `last_device` precedent, no
 * prior multi-device pattern in this schema). Set via
 * `POST /v1/auth/me/device-token`, read by
 * `NotificationsService.createForUser` to fire a push alongside every
 * in-app notification it already creates. `updated_at` is tracked
 * separately from the row's own `updated_at` so "how stale is this
 * token" can be reasoned about independently of unrelated profile
 * edits.
 */
export class AddFcmTokenToUsers1783774800000 implements MigrationInterface {
  name = 'AddFcmTokenToUsers1783774800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "fcm_token" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "fcm_token_updated_at" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "fcm_token_updated_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "fcm_token"`);
  }
}
