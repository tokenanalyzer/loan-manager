import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { FollowUpEntity, FollowUpStatus } from '../database/entities';

@Injectable()
export class FollowUpRepository extends BaseRepository<FollowUpEntity> {
  constructor(@InjectRepository(FollowUpEntity) repository: Repository<FollowUpEntity>) {
    super(repository);
  }

  /** Soonest-due first — the natural order for a Follow-ups list. */
  async findAllForEmployee(employeeId: string, status?: FollowUpStatus): Promise<FollowUpEntity[]> {
    return this.repository.find({
      where: { assignedToId: employeeId, ...(status ? { status } : {}) },
      relations: ['loanApplication', 'loanApplication.applicant'],
      order: { dueAt: 'ASC' },
    });
  }

  /** Same shape as `findAllForEmployee`'s relations — used to build a consistent response DTO after create/update. */
  async findOneWithRelations(id: string): Promise<FollowUpEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['loanApplication', 'loanApplication.applicant'],
    });
  }

  async countPendingForEmployee(employeeId: string): Promise<number> {
    return this.repository.count({ where: { assignedToId: employeeId, status: FollowUpStatus.PENDING } });
  }

  /** "Today's Tasks" — pending follow-ups whose due date falls within [dayStart, dayEnd). */
  async countDueTodayForEmployee(employeeId: string, dayStart: Date, dayEnd: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('followUp')
      .where('followUp.assigned_to_id = :employeeId', { employeeId })
      .andWhere('followUp.status = :status', { status: FollowUpStatus.PENDING })
      .andWhere('followUp.due_at >= :dayStart', { dayStart })
      .andWhere('followUp.due_at < :dayEnd', { dayEnd })
      .getCount();
  }
}
