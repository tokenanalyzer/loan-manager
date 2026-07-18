import { Icon } from '../ui/Icon';

import { Breadcrumbs } from './Breadcrumbs';
import styles from './Topbar.module.css';
import { UserMenu } from './UserMenu';

/** Sticky top bar: mobile sidebar toggle + breadcrumbs on the left, user menu on the right. */
export function Topbar({ onMenuClick }: { onMenuClick: () => void }): JSX.Element {
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
      <UserMenu />
    </header>
  );
}
