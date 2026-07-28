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
  { label: 'Documents', path: '/documents', icon: 'upload', roles: ['admin'] },
  { label: 'Approvals', path: '/settings/approvals', icon: 'shieldCheck', roles: ['admin'] },
  { label: 'Tasks', path: '/tasks', icon: 'checkCircle', roles: ['admin'], comingSoon: true },
  { label: 'Customers', path: '/customers', icon: 'people', roles: ['admin'], comingSoon: true },
  { label: 'Employees', path: '/settings/team', icon: 'user', roles: ['admin', 'org_admin'] },
  { label: 'Employee Status', path: '/employee-status', icon: 'clock', roles: ['admin'] },
  { label: 'Reports', path: '/reports', icon: 'barChart', roles: ['admin'] },
  { label: 'Settings', path: '/settings', icon: 'settings', roles: ['admin'] },
  { label: 'Notifications', path: '/notifications', icon: 'bell', roles: ['admin'] },
];

/**
 * Employee CRM — a completely separate nav structure from admin's
 * `NAV_ITEMS` (user-directed architecture: the Employee experience
 * gets its own URL namespace and nav, not an admin route reused with
 * a role check). Every path lives under `/employee/*`; `getNavItemsForRole`
 * below returns this list instead of filtering `NAV_ITEMS` when the
 * caller's role is `employee` — the two lists are never merged.
 */
export const EMPLOYEE_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/employee/dashboard', icon: 'home', roles: ['employee'] },
  { label: 'My Leads', path: '/employee/my-leads', icon: 'inbox', roles: ['employee'] },
  { label: 'My Customers', path: '/employee/my-customers', icon: 'people', roles: ['employee'] },
  { label: 'Follow-ups', path: '/employee/follow-ups', icon: 'calendar', roles: ['employee'] },
  { label: 'Documents', path: '/employee/documents', icon: 'upload', roles: ['employee'] },
  { label: 'Notifications', path: '/employee/notifications', icon: 'bell', roles: ['employee'] },
  { label: 'Profile', path: '/employee/profile', icon: 'user', roles: ['employee'] },
];

export function getNavItemsForRole(role: UserRole | undefined): NavItem[] {
  if (!role) return [];
  if (role === 'employee') return EMPLOYEE_NAV_ITEMS;
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
