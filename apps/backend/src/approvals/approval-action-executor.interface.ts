import { Injectable } from '@nestjs/common';

import { UserEntity } from '../database/entities';

/**
 * Something that actually performs a gated action once a checker
 * approves the request for it. Implementations must re-validate every
 * precondition from scratch (not trust that nothing changed since the
 * request was created) — see `UsersService`'s `execute*` methods for
 * the reference implementation.
 */
export interface ApprovalActionExecutor {
  /** `maker` is the original requester, not the checker — see ApprovalsService.decide's doc comment for why the maker is threaded through as the acting user. */
  execute(targetUserId: string, payload: Record<string, unknown>, maker: UserEntity): Promise<unknown>;
}

/**
 * `action string -> executor` registry — the mechanism that lets
 * `ApprovalsService.decide` execute an approved request without ever
 * branching on the action name itself. Each domain module (today just
 * `UsersModule`, for the three staff-lifecycle actions) registers its
 * own executors at bootstrap; a future module can register more
 * without any change here or in `ApprovalsService`.
 */
@Injectable()
export class ApprovalActionExecutorRegistry {
  private readonly executors = new Map<string, ApprovalActionExecutor>();

  register(action: string, executor: ApprovalActionExecutor): void {
    this.executors.set(action, executor);
  }

  get(action: string): ApprovalActionExecutor {
    const executor = this.executors.get(action);
    if (!executor) {
      throw new Error(`No approval executor registered for action "${action}".`);
    }
    return executor;
  }
}
