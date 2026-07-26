import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogEntity, EmployeeProfileEntity, UserEntity } from '../database/entities';
import { EmployeeProfileRepository } from '../work-status/employee-profile.repository';

import { UserRepository } from './user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * UsersModule — provides UserRepository for anything (AuthModule) that
 * needs to read/write the `users` table, and now the staff-account
 * provisioning endpoints (UsersController/UsersService).
 *
 * `EmployeeProfileRepository` is the same class `WorkStatusModule`
 * uses (reused, not duplicated) — provided here directly against this
 * module's own `TypeOrmModule.forFeature` rather than importing
 * `WorkStatusModule`, since that module already imports `UsersModule`
 * and importing it back would be circular. TypeORM repositories are
 * stateless wrappers; providing the same repository class in two
 * modules is a normal, safe pattern.
 *
 * `AuditLogEntity` is registered here too (`UsersService` writes
 * `staff_invited` rows directly via its repository — same pattern as
 * `CustomersModule`). `FirebaseAdminService` is not listed as a
 * provider here: it comes from the `@Global()` `FirebaseAdminModule`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, EmployeeProfileEntity, AuditLogEntity])],
  controllers: [UsersController],
  providers: [UserRepository, EmployeeProfileRepository, UsersService],
  exports: [UserRepository],
})
export class UsersModule {}
