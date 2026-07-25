import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLE_PERMISSIONS, Permission } from '../permissions';

import { RequestWithAppUser } from './sync-user.guard';

/**
 * PermissionsGuard — enforces `@RequirePermissions(...)` metadata
 * against the synced app user's role via ROLE_PERMISSIONS.
 *
 * Must run *after* SyncUserGuard, same as RolesGuard, since it reads
 * `request.appUser`. A missing/empty permissions list denies access —
 * unlike RolesGuard's `@Auth()`-with-no-args convenience, there's no
 * "any authenticated user" case for a permission-gated endpoint.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    const request = context.switchToHttp().getRequest<RequestWithAppUser>();
    const granted = ROLE_PERMISSIONS[request.appUser.role];
    const hasAllRequired = requiredPermissions.every((permission) => granted.includes(permission));

    if (!hasAllRequired) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    return true;
  }
}
