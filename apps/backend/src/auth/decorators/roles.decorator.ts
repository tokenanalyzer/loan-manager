import { SetMetadata } from '@nestjs/common';

import { UserRole } from '../../database/entities';

export const ROLES_KEY = 'roles';

/**
 * @Roles(...) — metadata read by RolesGuard. An empty list (the
 * default, via @Auth() with no args) means "any authenticated role".
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
