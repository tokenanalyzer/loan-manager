import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { EmployeeBreakEntity } from '../database/entities';

@Injectable()
export class EmployeeBreakRepository extends BaseRepository<EmployeeBreakEntity> {
  constructor(
    @InjectRepository(EmployeeBreakEntity) repository: Repository<EmployeeBreakEntity>,
  ) {
    super(repository);
  }

  /** The currently open break for this employee, if any — `endedAt IS NULL`. */
  async findActiveBreak(employeeId: string): Promise<EmployeeBreakEntity | null> {
    return this.repository.findOne({ where: { employeeId, endedAt: IsNull() } });
  }

  async findAllByEmployee(employeeId: string): Promise<EmployeeBreakEntity[]> {
    return this.repository.find({
      where: { employeeId },
      order: { startedAt: 'DESC' },
      relations: ['endedByAdmin'],
    });
  }
}
