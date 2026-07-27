import type {
  ApprovalDecisionPayload,
  ApprovalRequest,
  ListApprovalsQueryParams,
  PaginatedResult,
} from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

/**
 * Approvals API client — thin wrappers over the shared `apiClient`
 * around `ApprovalsController` on the backend (Admin Authentication
 * Module, Phase 5).
 */

export async function fetchPendingApprovals(
  params: ListApprovalsQueryParams = {},
): Promise<PaginatedResult<ApprovalRequest>> {
  const { data } = await apiClient.get<PaginatedResult<ApprovalRequest>>('/v1/approvals', {
    params: { page: 1, pageSize: 20, ...params },
  });
  return data;
}

export async function fetchMyApprovals(): Promise<ApprovalRequest[]> {
  const { data } = await apiClient.get<ApprovalRequest[]>('/v1/approvals/mine');
  return data;
}

export async function decideApproval(
  id: string,
  payload: ApprovalDecisionPayload,
): Promise<{ request: ApprovalRequest }> {
  const { data } = await apiClient.post<{ request: ApprovalRequest }>(`/v1/approvals/${id}/decision`, payload);
  return data;
}

export async function withdrawApproval(id: string): Promise<ApprovalRequest> {
  const { data } = await apiClient.patch<ApprovalRequest>(`/v1/approvals/${id}/withdraw`);
  return data;
}
