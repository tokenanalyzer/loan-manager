import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { UserEntity } from '../../database/entities';
import { RequestWithAppUser } from '../guards/sync-user.guard';

/**
 * @CurrentAppUser() — injects the synced `UserEntity` (attached by
 * SyncUserGuard) into a controller method parameter. Only usable on
 * routes protected by `@Auth(...)` (which includes SyncUserGuard).
 */
export const CurrentAppUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity => {
    const request = ctx.switchToHttp().getRequest<RequestWithAppUser>();
    return request.appUser;
  },
);
