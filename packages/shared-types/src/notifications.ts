/**
 * Notification domain types — mirrors the backend's
 * `NotificationsController`/`NotificationResponseDto` (see
 * `apps/backend/src/notifications`).
 */

/** One in-app notification for the current user. */
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
}
