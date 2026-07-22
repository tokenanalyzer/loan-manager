import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { RewardEntity } from '../database/entities';

@Injectable()
export class RewardRepository extends BaseRepository<RewardEntity> {
  constructor(@InjectRepository(RewardEntity) repository: Repository<RewardEntity>) {
    super(repository);
  }

  async findAllByCustomer(customerId: string): Promise<RewardEntity[]> {
    return this.repository.find({ where: { customerId }, order: { createdAt: 'DESC' } });
  }

  async findByLoanId(loanId: string): Promise<RewardEntity | null> {
    return this.findOne({ loanId });
  }
}
