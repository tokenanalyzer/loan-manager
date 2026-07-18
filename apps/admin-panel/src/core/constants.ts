import type { UserRole } from '@loan-manager/shared-types';

export const APP_NAME = 'Loan Manager';

/** Human-readable label for each backend role, used in the user menu / topbar. */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Super Admin',
  employee: 'Employee',
  customer: 'Customer',
};
