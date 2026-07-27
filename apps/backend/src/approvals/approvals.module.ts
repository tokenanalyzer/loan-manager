import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApprovalRequestEntity, AuditLogEntity, UserEntity } from '../database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserRepository } from '../users/user.repository';

import { ApprovalActionExecutorRegistry } from './approval-action-executor.interface';
import { ApprovalRequestRepository } from './approval-request.repository';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { MakerCheckerPolicyService } from './maker-checker-policy';

/**
 * ApprovalsModule — a sibling of `UsersModule`, not folded into it.
 * `UsersModule` already covers a lot (staff provisioning + lifecycle);
 * this module's whole reason for existing is to stay generic across
 * *any* future gated action, not just staff lifecycle, so other
 * domain modules should be able to depend on it without depending on
 * `UsersModule`'s unrelated staff-provisioning surface.
 *
 * `UserRepository` is re-provided against this module's own
 * `TypeOrmModule.forFeature`, not imported from `UsersModule` — the
 * same no-cycle pattern `UsersModule` itself already uses for
 * `EmployeeProfileRepository`/`LoanApplicationRepository` (see its own
 * doc comment). `UsersModule` imports *this* module (to register its
 * staff-lifecycle executors and use `ApprovalsService`), so importing
 * `UsersModule` back here would be circular.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ApprovalRequestEntity, AuditLogEntity]), NotificationsModule],
  controllers: [ApprovalsController],
  providers: [
    UserRepository,
    ApprovalRequestRepository,
    MakerCheckerPolicyService,
    ApprovalActionExecutorRegistry,
    ApprovalsService,
  ],
  exports: [ApprovalsService, MakerCheckerPolicyService, ApprovalActionExecutorRegistry],
})
export class ApprovalsModule {}
