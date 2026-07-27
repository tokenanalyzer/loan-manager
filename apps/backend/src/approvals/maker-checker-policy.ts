import { Injectable } from '@nestjs/common';

import { UserRole } from '../database/entities';

import { ApprovalActionType } from './approval-action-type';

type PolicyKey = `${UserRole}:${ApprovalActionType}`;

/**
 * Data-only lookup table: which (role, action) pairs require a second
 * approver. Absence of a key means "no approval required" — the safe
 * default, so a role/action combination nobody has explicitly gated
 * stays immediate rather than silently blocking.
 *
 * Currently only `ORG_ADMIN` is gated on the three staff-lifecycle
 * actions — `ADMIN` (Super Admin) stays immediate, per the approved
 * Phase 5 design. Extending this to `ADMIN` later (full segregation of
 * duties) or to a brand-new action is a one-line addition here, never
 * a change to `ApprovalsService`/`UsersService`'s control flow.
 */
const REQUIRES_APPROVAL: Partial<Record<PolicyKey, true>> = {
  [`${UserRole.ORG_ADMIN}:${ApprovalActionType.STAFF_DISABLE}`]: true,
  [`${UserRole.ORG_ADMIN}:${ApprovalActionType.STAFF_ARCHIVE}`]: true,
  [`${UserRole.ORG_ADMIN}:${ApprovalActionType.STAFF_RESTORE}`]: true,
};

@Injectable()
export class MakerCheckerPolicyService {
  requiresApproval(role: UserRole, action: ApprovalActionType): boolean {
    return REQUIRES_APPROVAL[`${role}:${action}`] ?? false;
  }
}
