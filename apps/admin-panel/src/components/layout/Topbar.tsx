import type { ReactNode } from 'react';

import { Icon } from '../ui/Icon';

import { Breadcrumbs } from './Breadcrumbs';
import styles from './Topbar.module.css';
import { UserMenu } from './UserMenu';

/**
 * Sticky top bar: mobile sidebar toggle + breadcrumbs on the left,
 * optional status control + user menu on the right. `statusSlot` is
 * `undefined` for every role except Employee (see `AppLayout`), so the
 * right side renders exactly as before — just `UserMenu` — for
 * everyone else.
 */
export function Topbar({
  onMenuClick,
  statusSlot,
}: {
  onMenuClick: () => void;
  statusSlot?: ReactNode;
}): JSX.Element {
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
      <div className={styles.right}>
        {statusSlot}
        <UserMenu />
      </div>
    </header>
  );
}
