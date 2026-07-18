import { Injectable } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';

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
  constructor(private readonly userRepository: UserRepository) {}

  async syncFromFirebaseToken(decoded: DecodedIdToken): Promise<UserEntity> {
    const existing = await this.userRepository.findByFirebaseUid(decoded.uid);
    if (existing) {
      // Stamped on every synced authenticated request — powers the Lead
      // Assignment module's Online/Offline presence indicator.
      const withPresence = await this.userRepository.update(existing.id, {
        lastActiveAt: new Date(),
      });
      return withPresence ?? existing;
    }

    return this.userRepository.create({
      firebaseUid: decoded.uid,
      email: decoded.email ?? null,
      phone: decoded.phone_number ?? null,
      fullName: typeof decoded.name === 'string' ? decoded.name : null,
      role: UserRole.CUSTOMER,
      isActive: true,
    });
  }
}
