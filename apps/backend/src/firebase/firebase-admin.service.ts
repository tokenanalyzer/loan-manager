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
      const inviteLink = await auth.generatePasswordResetLink(email);
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
}
