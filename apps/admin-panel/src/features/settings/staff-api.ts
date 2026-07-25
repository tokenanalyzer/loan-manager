import type { CreateStaffUserPayload, PaginatedResult, StaffUser } from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

/**
 * Staff provisioning API client — thin wrappers over the shared
 * `apiClient` around `UsersController` on the backend (admin-only).
 */

export async function fetchStaff(page = 1, pageSize = 20): Promise<PaginatedResult<StaffUser>> {
  const { data } = await apiClient.get<PaginatedResult<StaffUser>>('/v1/users', {
    params: { page, pageSize },
  });
  return data;
}

export async function createStaffUser(payload: CreateStaffUserPayload): Promise<StaffUser> {
  const { data } = await apiClient.post<StaffUser>('/v1/users', payload);
  return data;
}
