import { SetMetadata } from '@nestjs/common';

import { Permission } from '../permissions';

export const PERMISSIONS_KEY = 'permissions';

/**
 * @RequirePermissions(...) — metadata read by PermissionsGuard. Unlike
 * @Roles, an empty list is not meaningful here — every endpoint using
 * this decorator should name at least one capability it needs.
 */
export const RequirePermissions = (...permissions: Permission[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);
