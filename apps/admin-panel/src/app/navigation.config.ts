import type { UserRole } from '@loan-manager/shared-types';

import type { IconName } from '../components/ui/Icon';

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  roles: UserRole[];
  /**
   * Marks a nav item whose route is a "Coming Soon" placeholder rather
   * than a real screen (Design System Foundation, Phase 1) — Customers,
   * Reports, and a general Settings hub don't exist as built screens
   * yet, "Applications" has no distinct view from Leads yet, and
   * "Tasks" has no backend concept at all. Wiring real screens behind
   * these is Phase 4 (or later) work, tracked in
   * apps/admin-panel/IMPLEMENTATION_PROGRESS.md.
   */
  comingSoon?: boolean;
}

/**
 * Single source of truth for sidebar links + breadcrumb labels.
 * Add new entries here as business modules land — `roles` controls
 * who sees the link (role-based routing), the same list drives
 * Breadcrumbs' path→label lookup.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'home', roles: ['admin'] },
  { label: 'Leads', path: '/leads', icon: 'inbox', roles: ['admin'] },
  { label: 'Applications', path: '/applications', icon: 'document', roles: ['admin'] },
  { label: 'Documents', path: '/documents', icon: 'upload', roles: ['admin', 'employee'] },
  { label: 'Approvals', path: '/settings/approvals', icon: 'shieldCheck', roles: ['admin'] },
  { label: 'Tasks', path: '/tasks', icon: 'checkCircle', roles: ['admin'], comingSoon: true },
  { label: 'Customers', path: '/customers', icon: 'people', roles: ['admin'], comingSoon: true },
  { label: 'Employees', path: '/settings/team', icon: 'user', roles: ['admin', 'org_admin'] },
  { label: 'Employee Status', path: '/employee-status', icon: 'clock', roles: ['admin'] },
  { label: 'Reports', path: '/reports', icon: 'barChart', roles: ['admin'] },
  { label: 'Settings', path: '/settings', icon: 'settings', roles: ['admin'] },
  { label: 'My Leads', path: '/my-leads', icon: 'inbox', roles: ['employee'] },
  { label: 'Notifications', path: '/notifications', icon: 'bell', roles: ['admin', 'employee'] },
];

export function getNavItemsForRole(role: UserRole | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
