import { Injectable } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { PinoLogger } from 'nestjs-pino';
import { QueryFailedError } from 'typeorm';

import { UserEntity, UserRole } from '../database/entities';
import { UserRepository } from '../users/user.repository';

/**
 * AuthService — syncs a verified Firebase identity with our `users` table.
 *
 * Phase 4 scope: find-or-create only. Deliberately never lets the
 * caller (or the Firebase token) specify a role: a first-time sign-in
 * is always created as UserRole.CUSTOMER, the lowest-privilege
 * default. Employee/admin accounts must already exist in the `users`
 * table (provisioned by a process outside this endpoint — an
 * admin-invite flow is future work) before their Firebase sign-in
 * will resolve to an employee/admin profile. This prevents anyone
 * with a merely-valid Firebase token from self-elevating privileges.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async syncFromFirebaseToken(decoded: DecodedIdToken): Promise<UserEntity> {
    const existing = await this.userRepository.findByFirebaseUid(decoded.uid);
    if (existing) {
      return this.syncExisting(existing, decoded);
    }

    return this.userRepository.create({
      firebaseUid: decoded.uid,
      email: decoded.email ?? null,
      phone: decoded.phone_number ?? null,
      fullName: typeof decoded.name === 'string' ? decoded.name : null,
      photoUrl: typeof decoded.picture === 'string' ? decoded.picture : null,
      role: UserRole.CUSTOMER,
      isActive: true,
    });
  }

  /**
   * Backfills email/phone/fullName/photoUrl from the token when the
   * existing user is still missing them — never overwrites a value the
   * user (or an earlier sync) already set. This is what makes Firebase
   * *account linking* actually useful: linking a second sign-in method
   * (e.g. phone-first customer later linking Google) doesn't change
   * their `firebaseUid`, but Firebase now includes the linked
   * provider's email/phone/picture in every subsequent ID token —
   * without this backfill, that newly-available identity data would
   * never reach our `users` row. See `customer_auth_repository.dart`'s
   * `linkGoogleAccount`/`linkPhoneNumber` on the client side.
   *
   * `photoUrl` is deliberately backfill-only too, not "always sync to
   * the token's latest value": a phone-only sign-in's token has no
   * `picture` claim at all, so always overwriting would wipe out a
   * photo captured earlier via a linked Google account the moment the
   * customer signs in with phone again.
   *
   * `email` is unique per user, so a backfill can collide with an
   * *unrelated* existing account that already claimed that email
   * (leftover fragmentation from before linking was supported — see
   * the phone-auth-frozen memory's 2026-07-23 addendum for the
   * reconciliation runbook). That collision is a data-hygiene issue to
   * flag, not a reason to fail the session sync that every authenticated
   * request depends on — so it's caught and logged, not rethrown.
   */
  private async syncExisting(
    existing: UserEntity,
    decoded: DecodedIdToken,
  ): Promise<UserEntity> {
    const patch: Partial<UserEntity> = {
      // Stamped on every synced authenticated request — powers the Lead
      // Assignment module's Online/Offline presence indicator.
      lastActiveAt: new Date(),
    };
    if (!existing.email && decoded.email) {
      patch.email = decoded.email;
    }
    if (!existing.phone && decoded.phone_number) {
      patch.phone = decoded.phone_number;
    }
    if (!existing.fullName && typeof decoded.name === 'string') {
      patch.fullName = decoded.name;
    }
    if (!existing.photoUrl && typeof decoded.picture === 'string') {
      patch.photoUrl = decoded.picture;
    }

    try {
      const updated = await this.userRepository.update(existing.id, patch);
      return updated ?? existing;
    } catch (error) {
      const driverCode = error instanceof QueryFailedError
        ? (error.driverError as { code?: string } | undefined)?.code
        : undefined;
      if (driverCode !== '23505') {
        throw error;
      }
      this.logger.warn(
        { err: error, userId: existing.id },
        'Identity backfill skipped: email/phone already claimed by another user record. ' +
          'Retrying with just the presence stamp — see phone-auth-frozen memory for the manual reconciliation runbook.',
      );
      const updated = await this.userRepository.update(existing.id, {
        lastActiveAt: patch.lastActiveAt,
      });
      return updated ?? existing;
    }
  }
}
