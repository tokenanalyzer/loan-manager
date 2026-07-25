import { applyDecorators, UseGuards } from '@nestjs/common';

import { UserRole } from '../../database/entities';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RolesGuard } from '../guards/roles.guard';
import { SyncUserGuard } from '../guards/sync-user.guard';
import { Permission } from '../permissions';

import { RequirePermissions } from './permissions.decorator';
import { Roles } from './roles.decorator';

/**
 * @Auth(...roles) — convenience decorator combining the three guards
 * every protected business endpoint needs, in the order they must run:
 *   1. FirebaseAuthGuard — verifies the ID token.
 *   2. SyncUserGuard — attaches the synced UserEntity as `request.appUser`.
 *   3. RolesGuard — enforces `@Roles(...roles)` against `appUser.role`.
 *
 * `@Auth()` with no arguments means "any authenticated user, any role".
 * `@Auth(UserRole.EMPLOYEE, UserRole.ADMIN)` restricts to those roles.
 *
 * Unchanged by the four-tier role model — existing call sites keep
 * working exactly as before. New staff-management endpoints should
 * prefer @AuthPermission below, which authorizes by capability instead
 * of a literal role match.
 */
export function Auth(...roles: UserRole[]): MethodDecorator & ClassDecorator {
  return applyDecorators(UseGuards(FirebaseAuthGuard, SyncUserGuard, RolesGuard), Roles(...roles));
}

/**
 * @AuthPermission(...permissions) — same guard chain as @Auth, but
 * authorizes against ROLE_PERMISSIONS instead of a role list. Prefer
 * this for anything staff-management-shaped (account creation,
 * disable/archive, password reset, audit access) so that rebalancing
 * which tier can do what is a change to permissions.ts, not to every
 * controller that checks it.
 */
export function AuthPermission(...permissions: Permission[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(FirebaseAuthGuard, SyncUserGuard, PermissionsGuard),
    RequirePermissions(...permissions),
  );
}
