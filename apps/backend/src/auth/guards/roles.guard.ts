import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRole } from '../../database/entities';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestWithAppUser } from './sync-user.guard';

/**
 * RolesGuard — enforces `@Roles(...)` metadata against the synced
 * app user's role.
 *
 * Must run *after* SyncUserGuard in the same `@UseGuards(...)` list,
 * since it reads `request.appUser`. An empty/missing roles list means
 * "any authenticated role is fine" (not "no access") — use `@Auth()`
 * with no arguments for that case.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAppUser>();
    const hasRole = requiredRoles.includes(request.appUser.role);

    if (!hasRole) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    return true;
  }
}
