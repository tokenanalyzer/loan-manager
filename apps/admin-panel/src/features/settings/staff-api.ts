import type {
  CreatedStaffUser,
  CreateStaffUserPayload,
  ListStaffQueryParams,
  PaginatedResult,
  StaffLifecycleReasonPayload,
  StaffUser,
} from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

/**
 * Staff provisioning API client — thin wrappers over the shared
 * `apiClient` around `UsersController` on the backend (admin-only).
 */

export async function fetchStaff(params: ListStaffQueryParams = {}): Promise<PaginatedResult<StaffUser>> {
  const { data } = await apiClient.get<PaginatedResult<StaffUser>>('/v1/users', {
    params: { page: 1, pageSize: 20, ...params },
  });
  return data;
}

export async function createStaffUser(payload: CreateStaffUserPayload): Promise<CreatedStaffUser> {
  const { data } = await apiClient.post<CreatedStaffUser>('/v1/users', payload);
  return data;
}

export async function disableStaffUser(id: string, reason: string): Promise<StaffUser> {
  const { data } = await apiClient.patch<StaffUser>(`/v1/users/${id}/disable`, {
    reason,
  } satisfies StaffLifecycleReasonPayload);
  return data;
}

export async function archiveStaffUser(id: string, reason: string): Promise<StaffUser> {
  const { data } = await apiClient.patch<StaffUser>(`/v1/users/${id}/archive`, {
    reason,
  } satisfies StaffLifecycleReasonPayload);
  return data;
}

export async function restoreStaffUser(id: string): Promise<StaffUser> {
  const { data } = await apiClient.patch<StaffUser>(`/v1/users/${id}/restore`);
  return data;
}

/** Covers both "Resend Invite" and "Password Reset" — same backend action; the caller picks which label to show. */
export async function resetStaffPassword(id: string): Promise<CreatedStaffUser> {
  const { data } = await apiClient.post<CreatedStaffUser>(`/v1/users/${id}/reset-password`);
  return data;
}
