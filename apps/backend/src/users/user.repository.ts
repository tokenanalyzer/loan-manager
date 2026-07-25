import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { UserEntity, UserRole } from '../database/entities';

/**
 * UserRepository — the first concrete repository extending the
 * generic BaseRepository<T> established in Phase 2.
 *
 * Phase 4 scope: find-or-create by Firebase UID (for login). Phase 5
 * adds `findAllByRole`, used by the CRM customer-listing endpoint.
 */
@Injectable()
export class UserRepository extends BaseRepository<UserEntity> {
  constructor(@InjectRepository(UserEntity) repository: Repository<UserEntity>) {
    super(repository);
  }

  async findByFirebaseUid(firebaseUid: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { firebaseUid } });
  }

  /**
   * Email has a unique constraint on `users`, so this can only ever
   * match zero or one row — there is no "multiple matches" case at
   * the database level. Used by `AuthService`'s pending-staff-invite
   * linking check.
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { email } });
  }

  /** Staff directory (EMPLOYEE/ADMIN only) for the Admin Panel's Team screen — paginated from the start. */
  async findStaffPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ items: UserEntity[]; total: number }> {
    const [items, total] = await this.repository.findAndCount({
      where: [{ role: UserRole.EMPLOYEE }, { role: UserRole.ADMIN }],
      relations: ['employeeProfile'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  async findAllByRole(role: UserRole): Promise<UserEntity[]> {
    return this.repository.find({ where: { role }, order: { createdAt: 'DESC' } });
  }

  /** Used by the Lead Assignment employee picker and Work Status dashboard (need `employeeCode`). */
  async findAllByRoleWithEmployeeProfile(role: UserRole): Promise<UserEntity[]> {
    return this.repository.find({
      where: { role },
      order: { createdAt: 'DESC' },
      relations: ['employeeProfile'],
    });
  }

  async findOneWithEmployeeProfile(id: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id }, relations: ['employeeProfile'] });
  }
}
