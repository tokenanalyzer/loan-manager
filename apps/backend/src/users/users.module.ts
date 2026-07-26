import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AuditLogEntity,
  EmployeeProfileEntity,
  LoanApplicationEntity,
  UserEntity,
} from '../database/entities';
import { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import { EmployeeProfileRepository } from '../work-status/employee-profile.repository';

import { UserRepository } from './user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * UsersModule — provides UserRepository for anything (AuthModule) that
 * needs to read/write the `users` table, and now the staff-account
 * provisioning endpoints (UsersController/UsersService).
 *
 * `EmployeeProfileRepository` and `LoanApplicationRepository` are the
 * same classes `WorkStatusModule`/`LoanApplicationsModule` use (reused,
 * not duplicated) — provided here directly against this module's own
 * `TypeOrmModule.forFeature` rather than importing those modules,
 * since `LoanApplicationsModule` transitively depends on `UsersModule`
 * (via `CustomersModule`) and importing it back would be circular.
 * TypeORM repositories are stateless wrappers; providing the same
 * repository class in two modules is a normal, safe pattern.
 * `LoanApplicationRepository` is what `UsersService.archiveStaffUser`
 * uses for its reassignment check (Phase 3).
 *
 * `AuditLogEntity` is registered here too (`UsersService` writes
 * `staff_invited`/`staff_disabled`/`staff_archived`/`staff_restored`
 * rows directly via its repository — same pattern as `CustomersModule`).
 * `FirebaseAdminService` is not listed as a provider here: it comes
 * from the `@Global()` `FirebaseAdminModule`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, EmployeeProfileEntity, LoanApplicationEntity, AuditLogEntity]),
  ],
  controllers: [UsersController],
  providers: [UserRepository, EmployeeProfileRepository, LoanApplicationRepository, UsersService],
  exports: [UserRepository],
})
export class UsersModule {}
