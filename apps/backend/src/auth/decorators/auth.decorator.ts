import { applyDecorators, UseGuards } from '@nestjs/common';

import { UserRole } from '../../database/entities';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { SyncUserGuard } from '../guards/sync-user.guard';
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
 */
export function Auth(...roles: UserRole[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(FirebaseAuthGuard, SyncUserGuard, RolesGuard),
    Roles(...roles),
  );
}
