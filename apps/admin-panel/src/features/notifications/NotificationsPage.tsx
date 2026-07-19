import type { AppNotification } from '@loan-manager/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageContainer } from '../../components/ui/PageContainer';
import { useAuth } from '../../core/auth-context';
import { formatDateTime } from '../workspace/lead-status-meta';

import { notificationTypeColor, notificationTypeLabel } from './notification-meta';
import { fetchMyNotifications, markAllAsRead, markNotificationAsRead } from './notifications-api';
import styles from './NotificationsPage.module.css';

/**
 * Notification Center — the current user's own in-app notifications
 * (`GET /v1/notifications` is already scoped server-side to the
 * caller). Reused by both Employee and Admin roles since notifications
 * exist for both today (assigned/transferred leads, KYC decisions,
 * break-ended) and nothing here is role-specific.
 *
 * Only a loan-application notification for an Employee is navigable —
 * that's the one detail route that exists (`/my-leads/:id`); Admin has
 * no equivalent lead-detail page yet, and KYC/break notifications have
 * no detail page at all, so those rows mark-as-read only.
 */
export function NotificationsPage(): JSX.Element {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setNotifications(await fetchMyNotifications());
    } catch {
      setError('Could not load notifications.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadIds = useMemo(
    () => (notifications ?? []).filter((n) => !n.isRead).map((n) => n.id),
    [notifications],
  );

  async function handleRowClick(notification: AppNotification): Promise<void> {
    if (!notification.isRead) {
      setBusyId(notification.id);
      try {
        const updated = await markNotificationAsRead(notification.id);
        setNotifications((prev) => prev?.map((n) => (n.id === updated.id ? updated : n)) ?? prev);
      } catch {
        setError('Could not mark that notification as read.');
      } finally {
        setBusyId(null);
      }
    }

    if (
      notification.relatedEntityType === 'loan_application' &&
      notification.relatedEntityId &&
      profile?.role === 'employee'
    ) {
      navigate(`/my-leads/${notification.relatedEntityId}`);
    }
  }

  async function handleMarkAllAsRead(): Promise<void> {
    if (unreadIds.length === 0) return;
    setMarkingAll(true);
    setError(null);
    try {
      await markAllAsRead(unreadIds);
      await load();
    } catch {
      setError('Could not mark all notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <PageContainer
      title="Notifications"
      description="Updates on your leads, KYC decisions, and account activity."
      actions={
        <Button
          variant="secondary"
          size="sm"
          disabled={!notifications || unreadIds.length === 0 || markingAll}
          onClick={() => void handleMarkAllAsRead()}
        >
          Mark all as read
        </Button>
      }
    >
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!error && notifications === null && <LoadingState message="Loading notifications…" />}

      {!error && notifications !== null && notifications.length === 0 && (
        <EmptyState icon="bell" message="You have no notifications yet." />
      )}

      {!error && notifications !== null && notifications.length > 0 && (
        <Card noPadding>
          <div className={styles.list}>
            {notifications.map((notification) => {
              const navigable =
                notification.relatedEntityType === 'loan_application' &&
                Boolean(notification.relatedEntityId) &&
                profile?.role === 'employee';
              const typeColor = notificationTypeColor(notification.relatedEntityType);

              return (
                <button
                  key={notification.id}
                  type="button"
                  className={[styles.row, !notification.isRead ? styles.unread : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => void handleRowClick(notification)}
                  disabled={busyId === notification.id}
                  aria-label={
                    navigable ? `${notification.title} — open lead` : notification.title
                  }
                >
                  <span
                    className={notification.isRead ? styles.readDot : styles.unreadDot}
                    aria-hidden="true"
                  />
                  <span className={styles.content}>
                    <span className={styles.topLine}>
                      <span className={styles.title}>{notification.title}</span>
                      <span className={styles.badge} style={{ color: typeColor }}>
                        {notificationTypeLabel(notification.relatedEntityType)}
                      </span>
                    </span>
                    <span className={styles.body}>{notification.body}</span>
                    <span className={styles.timestamp}>
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
