import type {
  CreateFollowUpPayload,
  FollowUp,
  FollowUpStatus,
  UpdateFollowUpPayload,
} from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

export async function fetchMyFollowUps(status?: FollowUpStatus): Promise<FollowUp[]> {
  const { data } = await apiClient.get<FollowUp[]>('/v1/follow-ups', {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function createFollowUp(payload: CreateFollowUpPayload): Promise<FollowUp> {
  const { data } = await apiClient.post<FollowUp>('/v1/follow-ups', payload);
  return data;
}

export async function updateFollowUp(id: string, payload: UpdateFollowUpPayload): Promise<FollowUp> {
  const { data } = await apiClient.patch<FollowUp>(`/v1/follow-ups/${id}`, payload);
  return data;
}

export async function updateFollowUpStatus(id: string, status: 'done' | 'cancelled'): Promise<FollowUp> {
  const { data } = await apiClient.patch<FollowUp>(`/v1/follow-ups/${id}/status`, { status });
  return data;
}
