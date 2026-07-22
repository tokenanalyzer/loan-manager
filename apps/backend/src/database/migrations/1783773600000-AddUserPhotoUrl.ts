import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddUserPhotoUrl — adds `photo_url` to `users`, populated from
 * Firebase's decoded `picture` claim (present for Google-authenticated
 * users, absent for phone-authenticated ones — see
 * `AuthService.syncFromFirebaseToken`). Nullable for the same reason
 * `email`/`full_name` are: phone-only sign-in has no photo to offer.
 */
export class AddUserPhotoUrl1783773600000 implements MigrationInterface {
  name = 'AddUserPhotoUrl1783773600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "photo_url" varchar(1024)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "photo_url"
    `);
  }
}
