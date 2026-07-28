import { Injectable } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { PinoLogger } from 'nestjs-pino';
import { QueryFailedError } from 'typeorm';

import { UserEntity, UserRole } from '../database/entities';
import { UserRepository } from '../users/user.repository';
import { PENDING_STAFF_UID_PREFIX } from '../users/users.service';

import { UpdateProfileDto } from './dto/update-profile.dto';

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

    if (decoded.email) {
      const pendingInvite = await this.findLinkablePendingInvite(decoded.email);
      if (pendingInvite) {
        return this.activateStaffInvite(pendingInvite, decoded);
      }
    }

    // Unchanged from before this change: no linkable pending invite
    // (including the case where an email matched but wasn't
    // linkable — see findLinkablePendingInvite) always falls through
    // to exactly this same customer-creation path, preserving the
    // existing customer authentication flow byte-for-byte.
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
   * All six conditions below are required — see the approved
   * architecture rule this implements: never promote a CUSTOMER into
   * EMPLOYEE/ADMIN automatically, and fail safe (return null, meaning
   * "not linkable") rather than link on any ambiguity. `email` is
   * unique on `users`, so there is never more than one candidate row
   * to evaluate — "multiple matches" cannot occur at the database
   * level.
   */
  private async findLinkablePendingInvite(email: string): Promise<UserEntity | null> {
    const candidate = await this.userRepository.findByEmail(email.trim().toLowerCase());
    if (!candidate) {
      return null;
    }

    const isLinkable =
      candidate.role !== UserRole.CUSTOMER &&
      candidate.firebaseUid.startsWith(PENDING_STAFF_UID_PREFIX) &&
      candidate.activatedAt === null &&
      candidate.isActive === true &&
      candidate.invitedAt !== null;

    return isLinkable ? candidate : null;
  }

  /** Replaces the placeholder sentinel with the real Firebase UID and stamps activation — the one and only time this row's `firebaseUid` ever changes. */
  private async activateStaffInvite(
    pending: UserEntity,
    decoded: DecodedIdToken,
  ): Promise<UserEntity> {
    const now = new Date();
    const updated = await this.userRepository.update(pending.id, {
      firebaseUid: decoded.uid,
      activatedAt: now,
      lastActiveAt: now,
      photoUrl: pending.photoUrl ?? (typeof decoded.picture === 'string' ? decoded.picture : null),
    });
    this.logger.info(
      { userId: pending.id, role: pending.role },
      'Staff invite activated via Firebase sign-in.',
    );
    return updated ?? pending;
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
    const now = new Date();
    const patch: Partial<UserEntity> = {
      // Stamped on every synced authenticated request — powers the Lead
      // Assignment module's Online/Offline presence indicator.
      lastActiveAt: now,
    };

    // Staff provisioning (`UsersService.createStaffUser`) now creates
    // the real Firebase user up front, so a provisioned account's
    // *first* sign-in always finds its row here (by firebaseUid)
    // rather than through `activateStaffInvite`'s legacy sentinel-swap
    // path. `activatedAt` still needs stamping exactly once, on that
    // first sign-in, for the Admin Panel's Active/"Invited — not
    // signed in yet" status to mean anything for these rows.
    if (existing.role !== UserRole.CUSTOMER && existing.invitedAt !== null && existing.activatedAt === null) {
      patch.activatedAt = now;
      this.logger.info(
        { userId: existing.id, role: existing.role },
        'Staff invite activated (first sign-in with a Firebase-provisioned identity).',
      );
    }

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
        activatedAt: patch.activatedAt,
      });
      return updated ?? existing;
    }
  }

  /**
   * Stamps the Phase 3 login-metadata fields — called exactly once per
   * fresh session, from `AuthController.createSession`
   * (`POST /v1/auth/session`), not from `SyncUserGuard`'s per-request
   * sync (which stamps `lastActiveAt` on *every* authenticated
   * request — a different, much noisier signal). `ip`/`userAgent` are
   * best-effort — always overwritten with the latest value, unlike the
   * backfill-only identity fields above, since "last" means "most
   * recent," not "first known."
   */
  async recordSuccessfulLogin(
    user: UserEntity,
    ip: string | null,
    userAgent: string | null,
  ): Promise<void> {
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      lastDevice: userAgent,
    });
  }

  /**
   * Called by `SyncUserGuard` when a still-valid Firebase token
   * belongs to a disabled/archived account — the one case where a
   * blocked sign-in is attributable to a specific known user (a bad
   * password never reaches our backend at all; Firebase owns that
   * failure). Best-effort by design (see the guard's call site): never
   * allowed to interfere with the `UnauthorizedException` it's
   * recorded alongside.
   */
  async recordFailedLogin(user: UserEntity): Promise<void> {
    await this.userRepository.update(user.id, { lastFailedLoginAt: new Date() });
  }

  /**
   * Self-service profile edit (`PATCH /v1/auth/me`) — only the fields
   * present in `dto` are touched, so an omitted field is left exactly
   * as-is rather than cleared.
   */
  async updateProfile(user: UserEntity, dto: UpdateProfileDto): Promise<UserEntity> {
    const patch: Partial<UserEntity> = {};
    if (dto.fullName !== undefined) {
      patch.fullName = dto.fullName.trim();
    }
    if (dto.phone !== undefined) {
      patch.phone = dto.phone.trim();
    }
    const updated = await this.userRepository.update(user.id, patch);
    return updated ?? user;
  }
}
