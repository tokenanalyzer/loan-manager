import { NavLink } from 'react-router-dom';

import { APP_NAME } from '../../core/constants';
import { Icon } from '../ui/Icon';

import styles from './Sidebar.module.css';

/**
 * Responsive sidebar: an off-canvas drawer on mobile (`isOpen`/`onClose`),
 * a collapsible icon-only rail on desktop (`isCollapsed`/`onToggleCollapse`).
 */
export function Sidebar({
  items,
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}: {
  items: { label: string; path: string; icon: Parameters<typeof Icon>[0]['name'] }[];
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}): JSX.Element {
  const classes = [styles.sidebar, isCollapsed ? styles.collapsed : '', isOpen ? styles.open : '']
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={classes}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>{APP_NAME.charAt(0)}</span>
        {!isCollapsed && <span>{APP_NAME}</span>}
      </div>

      <nav className={styles.nav}>
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              [styles.link, isActive ? styles.linkActive : ''].filter(Boolean).join(' ')
            }
          >
            <Icon name={item.icon} size={18} />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={styles.collapseToggle}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name={isCollapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
        </button>
      </div>
    </aside>
  );
}
