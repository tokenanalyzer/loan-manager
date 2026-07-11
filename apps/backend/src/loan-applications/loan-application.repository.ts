import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { LoanApplicationEntity } from '../database/entities';

@Injectable()
export class LoanApplicationRepository extends BaseRepository<LoanApplicationEntity> {
  constructor(
    @InjectRepository(LoanApplicationEntity) repository: Repository<LoanApplicationEntity>,
  ) {
    super(repository);
  }

  async findAllByApplicant(applicantId: string): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: { applicantId },
      order: { submittedAt: 'DESC' },
      relations: ['loan'],
    });
  }

  async findAllForReview(): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      order: { submittedAt: 'ASC' },
      relations: ['loan'],
    });
  }

  async findOneWithLoan(id: string): Promise<LoanApplicationEntity | null> {
    return this.repository.findOne({ where: { id }, relations: ['loan'] });
  }
}
