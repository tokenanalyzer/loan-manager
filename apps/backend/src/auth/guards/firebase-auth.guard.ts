import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { App } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { PinoLogger } from 'nestjs-pino';

import { FIREBASE_ADMIN_APP } from '../../firebase/firebase-admin.provider';

export interface RequestWithFirebaseUser extends Request {
  firebaseUser: DecodedIdToken;
}

/**
 * FirebaseAuthGuard — verifies a Firebase ID token on protected routes.
 *
 * Phase 4 scope: token verification only. It does not implement
 * sign-in/OTP itself (that happens client-side via the Firebase Auth
 * SDK in each app) — this guard only confirms a request is carrying a
 * valid, unexpired ID token, and attaches the decoded token to the
 * request as `firebaseUser`. No role/permission enforcement beyond
 * "is this a valid token" is implemented here.
 *
 * Returns 503 (not 401) when Firebase Admin itself isn't configured
 * (FIREBASE_ENABLED=false) — that's a deployment/config problem, not
 * an authentication failure by the caller.
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject(FIREBASE_ADMIN_APP) private readonly firebaseApp: App | null,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(FirebaseAuthGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.firebaseApp) {
      throw new ServiceUnavailableException(
        'Authentication is not configured for this environment (FIREBASE_ENABLED=false).',
      );
    }

    const request = context.switchToHttp().getRequest<RequestWithFirebaseUser>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    try {
      // `checkRevoked: true` also rejects tokens whose refresh tokens were
      // revoked (Force Logout / Disable Employee — see WorkStatusService),
      // rather than accepting them until their natural ~1hr expiry.
      const decoded = await getAuth(this.firebaseApp).verifyIdToken(token, true);
      request.firebaseUser = decoded;
      return true;
    } catch (error) {
      this.logger.warn({ err: error }, 'Firebase ID token verification failed.');
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return null;
    }
    return header.slice('Bearer '.length).trim() || null;
  }
}
