import { Provider } from '@nestjs/common';

import { ApprovalActionExecutorRegistry } from '../approvals/approval-action-executor.interface';
import { ApprovalActionType } from '../approvals/approval-action-type';

import { UsersService } from './users.service';

export const STAFF_LIFECYCLE_EXECUTOR_REGISTRATION = 'STAFF_LIFECYCLE_EXECUTOR_REGISTRATION';

/**
 * Registers `UsersService`'s three staff-lifecycle actions against the
 * shared `ApprovalActionExecutorRegistry` at module bootstrap. Nest
 * instantiates every provider listed in a module's `providers` array
 * eagerly, whether or not anything else injects it — that's what
 * guarantees this registration runs before any HTTP traffic, with no
 * `OnModuleInit` ordering to reason about.
 */
export const staffLifecycleExecutorRegistrationProvider: Provider = {
  provide: STAFF_LIFECYCLE_EXECUTOR_REGISTRATION,
  useFactory: (registry: ApprovalActionExecutorRegistry, usersService: UsersService) => {
    registry.register(ApprovalActionType.STAFF_DISABLE, {
      execute: (targetId, payload, maker) => usersService.executeDisable(targetId, payload.reason as string, maker),
    });
    registry.register(ApprovalActionType.STAFF_ARCHIVE, {
      execute: (targetId, payload, maker) => usersService.executeArchive(targetId, payload.reason as string, maker),
    });
    registry.register(ApprovalActionType.STAFF_RESTORE, {
      execute: (targetId, _payload, maker) => usersService.executeRestore(targetId, maker),
    });
  },
  inject: [ApprovalActionExecutorRegistry, UsersService],
};
