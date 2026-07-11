import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';

import { RequestWithFirebaseUser } from '../guards/firebase-auth.guard';

/**
 * @CurrentUser() — injects the decoded Firebase ID token attached by
 * FirebaseAuthGuard into a controller method parameter.
 *
 * Only usable on routes protected by FirebaseAuthGuard; on any other
 * route `request.firebaseUser` will be undefined.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DecodedIdToken => {
    const request = ctx.switchToHttp().getRequest<RequestWithFirebaseUser>();
    return request.firebaseUser;
  },
);
