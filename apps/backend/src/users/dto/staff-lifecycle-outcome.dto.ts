import { ApprovalRequestResponseDto } from '../../approvals/dto/approval-request-response.dto';

import { StaffUserResponseDto } from './staff-user-response.dto';

/**
 * Return shape for Disable/Archive/Restore (Phase 5) — the actor's
 * role/the maker-checker policy decides which branch comes back, not
 * the caller. `UsersController`'s handlers pass this straight through;
 * the Admin Panel branches on `outcome`.
 */
export type StaffLifecycleOutcome =
  | { outcome: 'executed'; user: StaffUserResponseDto }
  | { outcome: 'pending_approval'; request: ApprovalRequestResponseDto };
