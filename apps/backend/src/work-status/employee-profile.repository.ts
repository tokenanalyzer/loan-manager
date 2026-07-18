import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { EmployeeProfileEntity, WorkStatus } from '../database/entities';

@Injectable()
export class EmployeeProfileRepository extends BaseRepository<EmployeeProfileEntity> {
  constructor(
    @InjectRepository(EmployeeProfileEntity) repository: Repository<EmployeeProfileEntity>,
  ) {
    super(repository);
  }

  async findByUserId(userId: string): Promise<EmployeeProfileEntity | null> {
    return this.repository.findOne({ where: { userId } });
  }

  async updateStatusByUserId(userId: string, status: WorkStatus, since: Date): Promise<void> {
    await this.repository.update({ userId }, { currentStatus: status, currentStatusSince: since });
  }
}
