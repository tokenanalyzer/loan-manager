import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { LoanEntity, LoanStatus } from '../database/entities';

@Injectable()
export class LoanRepository extends BaseRepository<LoanEntity> {
  constructor(@InjectRepository(LoanEntity) repository: Repository<LoanEntity>) {
    super(repository);
  }

  /**
   * `Top-Up`/`BT_TOPUP` journey detection's only signal — true once
   * this customer has a *disbursed* (`ACTIVE`) personal loan with us.
   * Deliberately `ACTIVE`, not merely "approved": an approved-but-not-
   * yet-disbursed loan isn't something you'd "top up" yet. Will always
   * return false today since nothing transitions a loan to `ACTIVE`
   * yet — see `LoanJourneyDetectionService`.
   */
  async hasActivePersonalLoan(customerId: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('loan')
      .innerJoin('loan.application', 'application')
      .where('loan.customer_id = :customerId', { customerId })
      .andWhere('loan.status = :status', { status: LoanStatus.ACTIVE })
      .andWhere('application.category_id = :categoryId', { categoryId: 'personal' })
      .getCount();
    return count > 0;
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
