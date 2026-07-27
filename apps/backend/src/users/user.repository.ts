import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { AccountStatus, UserEntity, UserRole } from '../database/entities';

/** Whitelisted `findStaffPaginated` sort columns — the canonical list `ListStaffQueryDto` validates against, since a sort column is interpolated into `ORDER BY` and can't be parameterized like a value. */
export const STAFF_SORT_FIELDS = ['fullName', 'email', 'role', 'status', 'createdAt', 'lastLoginAt'] as const;
export type StaffSortField = (typeof STAFF_SORT_FIELDS)[number];

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

  /**
   * Staff directory (EMPLOYEE/ADMIN only) for the Admin Panel's Team
   * screen — paginated from the start, with optional search/filter/sort
   * (Phase 4). `sortBy` must be one of `STAFF_SORT_FIELDS` — validated
   * by `ListStaffQueryDto` before this ever runs, but re-asserted here
   * too since it's interpolated into the query builder's `ORDER BY`,
   * which cannot be parameterized like a value.
   */
  async findStaffPaginated(params: {
    page: number;
    pageSize: number;
    search?: string;
    role?: UserRole;
    status?: AccountStatus;
    sortBy: string;
    sortDir: 'ASC' | 'DESC';
  }): Promise<{ items: UserEntity[]; total: number }> {
    if (!STAFF_SORT_FIELDS.includes(params.sortBy as (typeof STAFF_SORT_FIELDS)[number])) {
      throw new Error(`Invalid sort field: ${params.sortBy}`);
    }

    const qb = this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.employeeProfile', 'employeeProfile')
      .where('user.role IN (:...roles)', { roles: [UserRole.EMPLOYEE, UserRole.ADMIN] });

    if (params.role) {
      qb.andWhere('user.role = :role', { role: params.role });
    }
    if (params.status) {
      qb.andWhere('user.status = :status', { status: params.status });
    }
    if (params.search?.trim()) {
      qb.andWhere(
        '(LOWER(user.fullName) LIKE :search OR LOWER(user.email) LIKE :search OR LOWER(employeeProfile.employeeCode) LIKE :search)',
        { search: `%${params.search.trim().toLowerCase()}%` },
      );
    }

    qb.orderBy(`user.${params.sortBy}`, params.sortDir)
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize);

    const [items, total] = await qb.getManyAndCount();
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

  /**
   * Used by the last-Super-Admin guard (`UsersService`'s
   * Disable/Archive lifecycle) — counts *other* active accounts of a
   * role, excluding `excludingUserId`, so the caller can check "would
   * this action leave zero active Super Admins?" without an
   * off-by-one from counting the target itself.
   */
  async countActiveByRole(role: UserRole, excludingUserId?: string): Promise<number> {
    return this.repository.count({
      where: {
        role,
        status: AccountStatus.ACTIVE,
        ...(excludingUserId ? { id: Not(excludingUserId) } : {}),
      },
    });
  }

  /**
   * Global Search's Customers group — name/email/phone match directly;
   * PAN/Aadhaar matching is resolved by the caller (see
   * `CustomerProfileRepository.findUserIdsByPanOrAadhaar`) and passed
   * in as `extraMatchIds`, since `customer_profiles` is a separate
   * table with no ORM relation from `UserEntity`. `allowedIds`, when
   * given, scopes results to an employee's assigned customers.
   */
  async searchCustomers(
    query: string,
    limit: number,
    allowedIds?: string[],
    extraMatchIds: string[] = [],
  ): Promise<UserEntity[]> {
    if (allowedIds && allowedIds.length === 0) return [];

    const qb = this.repository.createQueryBuilder('user').where('user.role = :role', {
      role: UserRole.CUSTOMER,
    });

    const lower = `%${query.toLowerCase()}%`;
    const phoneLike = `%${query}%`;
    if (extraMatchIds.length > 0) {
      qb.andWhere(
        '(LOWER(user.full_name) LIKE :lower OR LOWER(user.email) LIKE :lower OR user.phone LIKE :phoneLike OR user.id IN (:...extraMatchIds))',
        { lower, phoneLike, extraMatchIds },
      );
    } else {
      qb.andWhere(
        '(LOWER(user.full_name) LIKE :lower OR LOWER(user.email) LIKE :lower OR user.phone LIKE :phoneLike)',
        { lower, phoneLike },
      );
    }

    if (allowedIds) {
      qb.andWhere('user.id IN (:...allowedIds)', { allowedIds });
    }

    return qb.orderBy('user.created_at', 'DESC').take(limit).getMany();
  }

  /** Global Search's Employees group — a staff directory lookup, unrestricted for any staff caller (Admin and Employee alike look up colleagues the same way). */
  async searchStaff(query: string, limit: number): Promise<UserEntity[]> {
    const lower = `%${query.toLowerCase()}%`;
    return this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.employeeProfile', 'employeeProfile')
      .where('user.role IN (:...roles)', {
        roles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ORG_ADMIN, UserRole.ADMIN],
      })
      .andWhere(
        '(LOWER(user.full_name) LIKE :lower OR LOWER(user.email) LIKE :lower OR LOWER(employeeProfile.employee_code) LIKE :lower)',
        { lower },
      )
      .take(limit)
      .getMany();
  }
}
