import type { UserRole } from '@loan-manager/shared-types';

import type { IconName } from '../components/ui/Icon';

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  roles: UserRole[];
}

/**
 * Single source of truth for sidebar links + breadcrumb labels.
 * Add new entries here as business modules land — `roles` controls
 * who sees the link (role-based routing), the same list drives
 * Breadcrumbs' path→label lookup.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Leads', path: '/leads', icon: 'inbox', roles: ['admin'] },
];

export function getNavItemsForRole(role: UserRole | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
