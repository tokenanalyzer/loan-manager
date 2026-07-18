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
