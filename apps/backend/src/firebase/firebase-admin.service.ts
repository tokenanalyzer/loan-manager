import { ConflictException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { PinoLogger } from 'nestjs-pino';

import { FIREBASE_ADMIN_APP } from './firebase-admin.provider';

export interface StaffInviteProvisioningResult {
  firebaseUid: string;
  inviteLink: string;
}

/**
 * FirebaseAdminService — the only place in the backend that talks to
 * Firebase Authentication's user-management API (as opposed to
 * `FirebaseAuthGuard`, which only verifies tokens already issued by
 * it). Used by `UsersService.createStaffUser` to actually create the
 * Firebase identity behind a provisioned staff account.
 *
 * Never touches a password: `createUser` is called with no password
 * field at all, so the account starts with no email/password
 * credential, and `generatePasswordResetLink` (Firebase's own
 * "set your password" flow, also used for invites) is what lets the
 * invitee establish one — the backend never sees or stores it.
 */
@Injectable()
export class FirebaseAdminService {
  constructor(
    @Inject(FIREBASE_ADMIN_APP) private readonly firebaseApp: App | null,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(FirebaseAdminService.name);
  }

  /**
   * Creates the Firebase Authentication user and generates its
   * password-setup link in one step. If link generation fails after
   * the user was already created, the just-created Firebase user is
   * deleted (best effort) before rethrowing, so a partial failure here
   * never leaves an orphaned Firebase identity with no corresponding
   * `users` row yet to be created by the caller.
   */
  async provisionStaffAccount(
    email: string,
    displayName: string,
  ): Promise<StaffInviteProvisioningResult> {
    const auth = getAuth(this.requireApp());

    let firebaseUid: string;
    try {
      const record = await auth.createUser({ email, displayName, emailVerified: false, disabled: false });
      firebaseUid = record.uid;
    } catch (error) {
      if (this.isFirebaseErrorCode(error, 'auth/email-already-exists')) {
        throw new ConflictException(
          'A Firebase account already exists for this email (possibly a Customer App sign-in). ' +
            'Staff provisioning cannot reuse an existing Firebase identity.',
        );
      }
      this.logger.error({ err: error, email }, 'Firebase user creation failed.');
      throw error;
    }

    try {
      const inviteLink = await this.generatePasswordSetupLink(email);
      return { firebaseUid, inviteLink };
    } catch (error) {
      this.logger.error(
        { err: error, firebaseUid, email },
        'Invite-link generation failed after Firebase user creation — rolling back the Firebase user.',
      );
      await this.deleteUser(firebaseUid);
      throw error;
    }
  }

  /**
   * Generates a fresh password-setup link for an *existing* Firebase
   * user, without creating or changing anything else. Used directly by
   * `provisionStaffAccount` above (a brand-new user's first link) and
   * by `UsersService.resendInviteOrResetPassword` (Phase 4) — "Resend
   * Invite" and "Password Reset" are the same Firebase operation on an
   * existing account, distinguished only by UI label.
   *
   * Translates the specific failure mode where the `users` row's
   * `firebaseUid` doesn't correspond to a real, actionable Firebase
   * identity (`auth/user-not-found`, or the Admin SDK's known
   * catch-all `auth/internal-error` for "Unable to create the email
   * action link") into a clear `ConflictException` — this is a real
   * gap only reachable by dev-fixture rows inserted directly against
   * the database with a placeholder UID rather than provisioned
   * through `createStaffUser`; every account provisioned through this
   * system always has a real, actionable Firebase identity. Any other
   * error is rethrown unchanged (still logged) so a genuinely
   * transient Firebase problem isn't mischaracterized as this one.
   */
  async generatePasswordSetupLink(email: string): Promise<string> {
    try {
      return await getAuth(this.requireApp()).generatePasswordResetLink(email);
    } catch (error) {
      if (this.isMissingFirebaseIdentity(error)) {
        this.logger.warn(
          { err: error, email },
          'Cannot generate a password-setup link: no real Firebase identity for this email — likely a dev-fixture row not provisioned through createStaffUser.',
        );
        throw new ConflictException(
          "Could not generate a link for this account — it doesn't have a real Firebase identity " +
            '(this can happen for dev/test rows inserted directly, rather than through staff provisioning).',
        );
      }
      throw error;
    }
  }

  /**
   * Best-effort delete used for rollback (either by
   * `provisionStaffAccount` itself, or by `UsersService` when the DB
   * insert following a successful Firebase creation fails). Never
   * throws — a failed rollback is logged, not propagated, so it can't
   * mask the original error that triggered the rollback.
   */
  async deleteUser(firebaseUid: string): Promise<void> {
    try {
      await getAuth(this.requireApp()).deleteUser(firebaseUid);
    } catch (error) {
      this.logger.error(
        { err: error, firebaseUid },
        'Rollback failed: could not delete the Firebase user. Manual cleanup required.',
      );
    }
  }

  /**
   * Best-effort immediate session kill (`revokeRefreshTokens`), used
   * by Disable/Archive across every staff role (Phase 3) and by Work
   * Status's Force Logout/Disable Employee (`WorkStatusService`,
   * which used to duplicate this logic locally — now delegates here).
   * Never throws: the account's `isActive`/`status` flip is the
   * authoritative enforcement (`SyncUserGuard` checks it on every
   * request), so a transient Firebase error here must never roll back
   * the DB-side effect that already happened. If Firebase Admin isn't
   * configured in this environment, this is a silent no-op (consistent
   * with `FirebaseAuthGuard`'s and the old inline implementation's
   * behavior).
   */
  async revokeSessions(firebaseUid: string): Promise<void> {
    if (!this.firebaseApp) {
      return;
    }
    try {
      await getAuth(this.firebaseApp).revokeRefreshTokens(firebaseUid);
    } catch (error) {
      this.logger.warn({ err: error, firebaseUid }, 'Failed to revoke Firebase sessions — proceeding anyway.');
    }
  }

  private requireApp(): App {
    if (!this.firebaseApp) {
      throw new ServiceUnavailableException(
        'Firebase Admin is not configured for this environment (FIREBASE_ENABLED=false) — staff accounts cannot be provisioned.',
      );
    }
    return this.firebaseApp;
  }

  private isFirebaseErrorCode(error: unknown, code: string): boolean {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === code;
  }

  private isMissingFirebaseIdentity(error: unknown): boolean {
    if (this.isFirebaseErrorCode(error, 'auth/user-not-found')) {
      return true;
    }
    if (!this.isFirebaseErrorCode(error, 'auth/internal-error')) {
      return false;
    }
    const nestedMessage = (error as { errorInfo?: { message?: string } }).errorInfo?.message ?? '';
    return nestedMessage.includes('Unable to create the email action link');
  }
}
