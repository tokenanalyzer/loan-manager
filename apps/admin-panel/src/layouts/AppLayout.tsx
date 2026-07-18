import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { getNavItemsForRole } from '../app/navigation.config';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { useAuth } from '../core/auth-context';

import styles from './AppLayout.module.css';

/**
 * The main application shell: responsive Sidebar + Topbar + page
 * content (`<Outlet/>`). Role-based routes render inside this layout
 * (see `app/router.tsx`); auth/error/full-page states do not.
 */
export function AppLayout(): JSX.Element {
  const { profile } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const items = getNavItemsForRole(profile?.role);

  return (
    <div className={styles.shell}>
      <Sidebar
        items={items}
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((value) => !value)}
      />

      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className={`${styles.scrim} ${styles.scrimVisible}`}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={styles.main}>
        <Topbar onMenuClick={() => setIsMobileOpen(true)} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
