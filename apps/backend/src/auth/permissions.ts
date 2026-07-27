import { UserRole } from '../database/entities';

/**
 * Permission — one entry per distinct capability, not per role. Guards
 * check membership in ROLE_PERMISSIONS, never a literal role value, so
 * that extending or rebalancing access later is a change to the map
 * below, not a new guard or a new decorator on every affected
 * endpoint. See the Admin Authentication Module design review, §04.
 */
export enum Permission {
  /** Create a Super Admin or Admin account. Super Admin only. */
  STAFF_CREATE_SENIOR = 'staff:create-senior',
  /** Create a Manager or Employee account. */
  STAFF_CREATE_JUNIOR = 'staff:create-junior',
  STAFF_READ = 'staff:read',
  STAFF_DISABLE = 'staff:disable',
  STAFF_ARCHIVE = 'staff:archive',
  /** Re-activate a disabled/archived account. Kept separate from
   *  STAFF_DISABLE/STAFF_ARCHIVE — re-granting access to a previously
   *  deactivated account is at least as sensitive as removing it, and
   *  deserves its own line in the audit trail. */
  STAFF_RESTORE = 'staff:restore',
  STAFF_RESET_PASSWORD = 'staff:reset-password',
  /** Change what role an existing account holds. Kept separate from
   *  STAFF_CREATE_* — creating a Manager and promoting someone to
   *  Admin are different-weight actions. Super Admin only. */
  ROLE_ASSIGN = 'role:assign',
  AUDIT_READ = 'audit:read',
  /** View the maker-checker approval queue. Super Admin only — see MakerCheckerPolicyService for who currently needs a checker at all. */
  APPROVAL_READ = 'approval:read',
  /** Approve/reject a pending approval request. Super Admin only. */
  APPROVAL_DECIDE = 'approval:decide',
}

const ALL_PERMISSIONS = Object.values(Permission);

/**
 * The one source of truth for what each role can do. Every UserRole
 * has an entry, including CUSTOMER/EMPLOYEE with an empty list —
 * deliberate, so a missing entry is a type error, not a silent
 * "everything denied" default at request time.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: ALL_PERMISSIONS,
  [UserRole.ORG_ADMIN]: [
    Permission.STAFF_CREATE_JUNIOR,
    Permission.STAFF_READ,
    Permission.STAFF_DISABLE,
    Permission.STAFF_ARCHIVE,
    Permission.STAFF_RESTORE,
    Permission.STAFF_RESET_PASSWORD,
    Permission.AUDIT_READ,
  ],
  [UserRole.MANAGER]: [],
  [UserRole.EMPLOYEE]: [],
  [UserRole.CUSTOMER]: [],
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
