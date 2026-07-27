import { NavLink } from 'react-router-dom';

import logoMark from '../../assets/branding/app_icon.png';
import { APP_NAME } from '../../core/constants';
import { Icon } from '../ui/Icon';

import styles from './Sidebar.module.css';

export interface SidebarNavItem {
  label: string;
  path: string;
  icon: Parameters<typeof Icon>[0]['name'];
  /** Optional live count badge (e.g. unassigned leads, pending approvals) — omitted entirely when undefined, never rendered as 0 by default. */
  count?: number;
}

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
  items: SidebarNavItem[];
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
        <img src={logoMark} alt={APP_NAME} className={styles.brandMark} />
        {!isCollapsed && (
          <div className={styles.brandTextGroup}>
            <span className={styles.brandName}>{APP_NAME}</span>
            <span className={styles.brandSubtitle}>Admin Panel</span>
          </div>
        )}
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
            <span className={styles.linkIcon}>
              <Icon name={item.icon} size={18} />
            </span>
            {!isCollapsed && (
              <>
                <span className={styles.linkLabel}>{item.label}</span>
                {item.count != null && <span className={styles.badge}>{item.count}</span>}
              </>
            )}
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
