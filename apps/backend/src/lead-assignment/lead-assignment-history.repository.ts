import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { LeadAssignmentEntity } from '../database/entities';

@Injectable()
export class LeadAssignmentHistoryRepository extends BaseRepository<LeadAssignmentEntity> {
  constructor(
    @InjectRepository(LeadAssignmentEntity) repository: Repository<LeadAssignmentEntity>,
  ) {
    super(repository);
  }

  async findAllByApplication(loanApplicationId: string): Promise<LeadAssignmentEntity[]> {
    return this.repository.find({
      where: { loanApplicationId },
      order: { createdAt: 'DESC' },
      relations: ['previousAssignee', 'newAssignee', 'assignedBy'],
    });
  }
}
