import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { LoanEntity } from '../database/entities';

@Injectable()
export class LoanRepository extends BaseRepository<LoanEntity> {
  constructor(@InjectRepository(LoanEntity) repository: Repository<LoanEntity>) {
    super(repository);
  }

  /**
   * Generates a human-readable, sufficiently-unique loan number.
   * Not cryptographically unique — relies on the `uq_loans_loan_number`
   * DB constraint (Phase 3) as the actual guarantee; a collision here
   * would surface as a 500 on save, which is acceptable at this scale
   * and volume for Phase 5.
   */
  generateLoanNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0');
    return `LN-${year}-${random}`;
  }
}
