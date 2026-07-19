import type { AppNotification } from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

/**
 * Notification Center API client — thin wrappers over the shared
 * `apiClient` around the backend's `NotificationsController`. There is
 * no bulk "mark all as read" endpoint, so `markAllAsRead` reuses the
 * single-notification endpoint concurrently rather than adding a new
 * backend route for it.
 */

export async function fetchMyNotifications(): Promise<AppNotification[]> {
  const { data } = await apiClient.get<AppNotification[]>('/v1/notifications');
  return data;
}

export async function markNotificationAsRead(id: string): Promise<AppNotification> {
  const { data } = await apiClient.patch<AppNotification>(`/v1/notifications/${id}/read`);
  return data;
}

export async function markAllAsRead(unreadIds: string[]): Promise<void> {
  await Promise.all(unreadIds.map((id) => markNotificationAsRead(id)));
}
