import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { fetchMyNotifications } from '../../features/notifications/notifications-api';
import { Icon } from '../ui/Icon';

import { Breadcrumbs } from './Breadcrumbs';
import styles from './Topbar.module.css';
import { UserMenu } from './UserMenu';

/**
 * Sticky top bar: mobile sidebar toggle + breadcrumbs on the left, the
 * Global Search trigger, then dark-mode icon / notification bell /
 * optional status control / user menu on the right. `statusSlot` is
 * `undefined` for every role except Employee (see `AppLayout`).
 *
 * The search field is a button, not a text input — clicking it (or
 * Ctrl+K/Cmd+K from anywhere) opens the `GlobalSearchDialog` command
 * palette. `AppLayout` owns that dialog's open state and the global
 * keyboard shortcut, so search is reachable from every page, not just
 * this bar.
 *
 * The moon icon is a static visual element, not a working toggle —
 * the token architecture supports dark mode (see `tokens.css`), but
 * no dark UI ships yet, per instruction.
 */
export function Topbar({
  onMenuClick,
  onOpenSearch,
  statusSlot,
}: {
  onMenuClick: () => void;
  onOpenSearch: () => void;
  statusSlot?: ReactNode;
}): JSX.Element {
  const [unreadCount, setUnreadCount] = useState(0);
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

  useEffect(() => {
    let cancelled = false;
    fetchMyNotifications()
      .then((notifications) => {
        if (!cancelled) setUnreadCount(notifications.filter((n) => !n.isRead).length);
      })
      .catch(() => {
        // Non-critical — the bell just shows no badge if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Icon name="menu" size={20} />
        </button>
        <Breadcrumbs />
      </div>

      <button type="button" className={styles.search} onClick={onOpenSearch} aria-label="Open global search">
        <Icon name="search" size={16} className={styles.searchIcon} />
        <span className={styles.searchPlaceholder}>Search Case Number, Customer, Phone, Email…</span>
        <kbd className={styles.searchHint}>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>

      <div className={styles.right}>
        <button type="button" className={styles.iconButton} aria-label="Toggle theme" disabled>
          <Icon name="moon" size={18} />
        </button>
        <Link to="/notifications" className={styles.iconButton} aria-label="Notifications">
          <Icon name="bell" size={18} />
          {unreadCount > 0 && (
            <span className={styles.notificationBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </Link>
        {statusSlot}
        <UserMenu />
      </div>
    </header>
  );
}
