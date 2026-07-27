import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApprovalsModule } from '../approvals/approvals.module';
import {
  AuditLogEntity,
  EmployeeProfileEntity,
  LoanApplicationEntity,
  UserEntity,
} from '../database/entities';
import { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import { EmployeeProfileRepository } from '../work-status/employee-profile.repository';

import { staffLifecycleExecutorRegistrationProvider } from './staff-lifecycle-executors.provider';
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
 *
 * Phase 5: imports `ApprovalsModule` for `ApprovalsService`/
 * `MakerCheckerPolicyService` (used by `UsersService`'s Disable/Archive/
 * Restore fork) and `staffLifecycleExecutorRegistrationProvider`, an
 * eager provider that registers `UsersService.executeDisable`/
 * `executeArchive`/`executeRestore` against
 * `ApprovalActionExecutorRegistry` at bootstrap — see that provider's
 * doc comment for why it must be eager, not lazily injected.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, EmployeeProfileEntity, LoanApplicationEntity, AuditLogEntity]),
    ApprovalsModule,
  ],
  controllers: [UsersController],
  providers: [
    UserRepository,
    EmployeeProfileRepository,
    LoanApplicationRepository,
    UsersService,
    staffLifecycleExecutorRegistrationProvider,
  ],
  exports: [UserRepository],
})
export class UsersModule {}
