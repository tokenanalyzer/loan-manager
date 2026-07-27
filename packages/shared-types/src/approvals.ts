/**
 * Maker-checker approval domain types (Admin Authentication Module,
 * Phase 5) — mirrors the backend's `ApprovalRequestResponseDto` /
 * `ApprovalActionType` / `ApprovalRequestStatus`
 * (apps/backend/src/approvals/).
 */
import type { StaffUser } from './users';

/** Mirrors the backend's `ApprovalActionType` enum. Extend both sides together when a new gated action is added. */
export type ApprovalAction = 'staff_disable' | 'staff_archive' | 'staff_restore';

/** Mirrors the backend's `ApprovalRequestStatus` enum. */
export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'failed';

export interface ApprovalRequest {
  id: string;
  action: ApprovalAction;
  status: ApprovalRequestStatus;
  targetUserId: string | null;
  targetUserName: string | null;
  targetUserEmail: string | null;
  makerId: string | null;
  makerName: string | null;
  checkerId: string | null;
  checkerName: string | null;
  payload: Record<string, unknown> | null;
  decisionNote: string | null;
  failureReason: string | null;
  createdAt: string;
  decidedAt: string | null;
}

/** Mirrors the backend's `ApprovalDecisionDto` — the body for `POST /v1/approvals/:id/decision`. */
export interface ApprovalDecisionPayload {
  decision: 'approve' | 'reject';
  decisionNote?: string;
}

/** Mirrors the backend's `ListApprovalsQueryDto` — the query params for `GET /v1/approvals`. */
export interface ListApprovalsQueryParams {
  status?: ApprovalRequestStatus;
  action?: ApprovalAction;
  page?: number;
  pageSize?: number;
}

/**
 * The response shape for `PATCH /v1/users/:id/disable|archive|restore`
 * (Phase 5) — the actor's role decides which branch comes back, not
 * the caller. `StaffLifecycleModal` branches on `outcome`.
 */
export type StaffLifecycleOutcome =
  | { outcome: 'executed'; user: StaffUser }
  | { outcome: 'pending_approval'; request: ApprovalRequest };
