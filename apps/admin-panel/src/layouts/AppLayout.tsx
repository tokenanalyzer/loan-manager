import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { getNavItemsForRole } from '../app/navigation.config';
import { useNavCounts } from '../app/useNavCounts';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { useAuth } from '../core/auth-context';
import { GlobalSearchDialog } from '../features/search/GlobalSearchDialog';
import { BreakModeOverlay } from '../features/work-status/BreakModeOverlay';
import { ForceResumeBanner } from '../features/work-status/ForceResumeBanner';
import { StatusSwitcher } from '../features/work-status/StatusSwitcher';
import { useWorkStatusGate } from '../features/work-status/useWorkStatusGate';
import { backdropVariants, fadeVariants, slideUpVariants } from '../theme/motion';

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
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isEmployee = profile?.role === 'employee';
  const workStatus = useWorkStatusGate(isEmployee);

  // Global Search's Ctrl+K/Cmd+K — mounted once here (not in Topbar) so
  // it works from anywhere in the app shell, matching a real command
  // palette rather than only being reachable by clicking the trigger.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isAdmin = profile?.role === 'admin';
  const navCounts = useNavCounts(isAdmin);
  const items = getNavItemsForRole(profile?.role).map((item) => ({
    ...item,
    count:
      item.path === '/leads' ? navCounts.leads : item.path === '/settings/approvals' ? navCounts.approvals : undefined,
  }));

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

      <AnimatePresence>
        {isMobileOpen && (
          <motion.button
            type="button"
            aria-label="Close navigation"
            className={`${styles.scrim} ${styles.scrimVisible}`}
            onClick={() => setIsMobileOpen(false)}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          />
        )}
      </AnimatePresence>

      <GlobalSearchDialog open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <div className={styles.main}>
        <Topbar
          onMenuClick={() => setIsMobileOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
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
          <AnimatePresence>
            {workStatus.forceResumeMessage && (
              <motion.div variants={slideUpVariants} initial="initial" animate="animate" exit="exit">
                <ForceResumeBanner
                  message={workStatus.forceResumeMessage}
                  onDismiss={workStatus.dismissForceResumeMessage}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
