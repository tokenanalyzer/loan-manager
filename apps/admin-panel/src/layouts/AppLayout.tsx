import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { getNavItemsForRole } from '../app/navigation.config';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { useAuth } from '../core/auth-context';
import { BreakModeOverlay } from '../features/work-status/BreakModeOverlay';
import { ForceResumeBanner } from '../features/work-status/ForceResumeBanner';
import { StatusSwitcher } from '../features/work-status/StatusSwitcher';
import { useWorkStatusGate } from '../features/work-status/useWorkStatusGate';

import styles from './AppLayout.module.css';

/**
 * The main application shell: responsive Sidebar + Topbar + page
 * content (`<Outlet/>`). Role-based routes render inside this layout
 * (see `app/router.tsx`); auth/error/full-page states do not.
 *
 * Work Status (Online/Busy/Break) is Employee-only — `useWorkStatusGate`
 * is only enabled for that role, so every other role (Admin included)
 * gets `status: null`/`forceResumeMessage: null` forever and the shell
 * renders exactly as before this wiring: no StatusSwitcher, no
 * ForceResumeBanner, no BreakModeOverlay.
 */
export function AppLayout(): JSX.Element {
  const { profile } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isEmployee = profile?.role === 'employee';
  const workStatus = useWorkStatusGate(isEmployee);

  const items = getNavItemsForRole(profile?.role);

  if (isEmployee && workStatus.status?.isOnBreak) {
    return <BreakModeOverlay status={workStatus.status} onEndBreak={workStatus.end} />;
  }

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
        <Topbar
          onMenuClick={() => setIsMobileOpen(true)}
          statusSlot={
            isEmployee && workStatus.status ? (
              <StatusSwitcher
                status={workStatus.status}
                onSetStatus={workStatus.setManualStatus}
                onStartBreak={workStatus.start}
              />
            ) : undefined
          }
        />
        <div className={styles.content}>
          {workStatus.forceResumeMessage && (
            <ForceResumeBanner
              message={workStatus.forceResumeMessage}
              onDismiss={workStatus.dismissForceResumeMessage}
            />
          )}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
