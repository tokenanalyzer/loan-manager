import { UserRole } from '../database/entities';

import { Permission, ROLE_PERMISSIONS, roleHasPermission } from './permissions';

describe('ROLE_PERMISSIONS', () => {
  it('has an entry for every UserRole', () => {
    for (const role of Object.values(UserRole)) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    }
  });

  it('grants ADMIN (Super Admin) every permission', () => {
    for (const permission of Object.values(Permission)) {
      expect(roleHasPermission(UserRole.ADMIN, permission)).toBe(true);
    }
  });

  it('lets ORG_ADMIN create junior staff and reset passwords, but not create senior staff or assign roles', () => {
    expect(roleHasPermission(UserRole.ORG_ADMIN, Permission.STAFF_CREATE_JUNIOR)).toBe(true);
    expect(roleHasPermission(UserRole.ORG_ADMIN, Permission.STAFF_RESET_PASSWORD)).toBe(true);
    expect(roleHasPermission(UserRole.ORG_ADMIN, Permission.STAFF_CREATE_SENIOR)).toBe(false);
    expect(roleHasPermission(UserRole.ORG_ADMIN, Permission.ROLE_ASSIGN)).toBe(false);
  });

  it('grants MANAGER, EMPLOYEE, and CUSTOMER no staff-management permissions', () => {
    for (const role of [UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.CUSTOMER]) {
      expect(ROLE_PERMISSIONS[role]).toEqual([]);
    }
  });
});
