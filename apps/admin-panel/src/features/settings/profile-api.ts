import type { UpdateProfilePayload, UserProfile } from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

/** Settings → Profile self-edit — thin wrapper over `PATCH /v1/auth/me`. */
export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const { data } = await apiClient.patch<UserProfile>('/v1/auth/me', payload);
  return data;
}
