import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { UserEntity } from '../../database/entities';
import { AuthService } from '../auth.service';

import { RequestWithFirebaseUser } from './firebase-auth.guard';

export interface RequestWithAppUser extends RequestWithFirebaseUser {
  appUser: UserEntity;
}

/**
 * SyncUserGuard — attaches the synced `UserEntity` (not just the raw
 * Firebase token) to the request as `appUser`.
 *
 * Must run *after* FirebaseAuthGuard in the same `@UseGuards(...)`
 * list, since it reads `request.firebaseUser`. Exists as a guard
 * (not an interceptor) specifically so `RolesGuard` — which also runs
 * as a guard, before any interceptor — can read `request.appUser.role`.
 *
 * Uses the same `AuthService.syncFromFirebaseToken` as the auth
 * endpoints, so a first-time caller of *any* protected endpoint gets
 * find-or-created identically (always as UserRole.CUSTOMER — see
 * AuthService for why).
 *
 * Also enforces `isActive` here — the one place every protected
 * request passes through — so "Disable Employee" (Work Status &
 * Break Management's Admin Override) is airtight even if the
 * best-effort Firebase token revocation that goes with it doesn't
 * land immediately.
 */
@Injectable()
export class SyncUserGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAppUser>();
    const appUser = await this.authService.syncFromFirebaseToken(request.firebaseUser);
    if (!appUser.isActive) {
      throw new UnauthorizedException('This account has been disabled.');
    }
    request.appUser = appUser;
    return true;
  }
}
