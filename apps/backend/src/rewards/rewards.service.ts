import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { LoanEntity, RewardConfigEntity, RewardEntity, RewardStatus } from '../database/entities';

import { RewardConfigRepository } from './reward-config.repository';
import { RewardRepository } from './reward.repository';

export interface UpdateRewardConfigParams {
  rewardPercent?: number;
  isActive?: boolean;
  customerMessage?: string;
}

/**
 * RewardsService — the Personal Loan reward program.
 *
 * `generateForDisbursedLoan` is the *only* method that creates a
 * `RewardEntity`, and nothing in this codebase calls it yet — there is
 * no disbursement workflow for it to hook into (see the
 * AddRewardSystem migration's doc comment and
 * `LoanApplicationsService`, where `LoanEntity` rows are created on
 * approval but never transition to `ACTIVE`/get `disbursedAt` set).
 * That absence *is* the enforcement of "no reward before disbursement"
 * — there's no code path that can create one before that fact is real.
 *
 * When a real disbursement action ships, it should call
 * `generateForDisbursedLoan(loan, categoryId)` immediately after
 * setting `loan.status = ACTIVE` and `loan.disbursedAt`, ideally inside
 * the same transaction (mirrors how `NotificationsService.createForUser`
 * accepts an `EntityManager` for the same reason — not done here since
 * there's no caller yet to need it).
 */
@Injectable()
export class RewardsService {
  constructor(
    private readonly rewardConfigRepository: RewardConfigRepository,
    private readonly rewardRepository: RewardRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RewardsService.name);
  }

  async getConfig(categoryId: string): Promise<RewardConfigEntity | null> {
    return this.rewardConfigRepository.findByCategoryId(categoryId);
  }

  async updateConfig(
    categoryId: string,
    patch: UpdateRewardConfigParams,
  ): Promise<RewardConfigEntity> {
    const existing = await this.rewardConfigRepository.findByCategoryId(categoryId);
    if (!existing) {
      throw new NotFoundException(`No reward config exists for category "${categoryId}".`);
    }

    const updated = await this.rewardConfigRepository.update(existing.id, {
      rewardPercent: patch.rewardPercent?.toFixed(2),
      isActive: patch.isActive,
      customerMessage: patch.customerMessage,
    });
    if (!updated) {
      throw new NotFoundException('Reward config not found after update.');
    }
    return updated;
  }

  async listForCustomer(customerId: string): Promise<RewardEntity[]> {
    return this.rewardRepository.findAllByCustomer(customerId);
  }

  async generateForDisbursedLoan(loan: LoanEntity, categoryId: string): Promise<RewardEntity | null> {
    // Rewards apply only to Personal Loans — every other category is a
    // silent no-op, not an error, since a caller may reasonably call
    // this for any disbursed loan without pre-filtering by category.
    if (categoryId !== 'personal') {
      return null;
    }
    if (!loan.disbursedAt) {
      throw new BadRequestException(
        'Cannot generate a reward for a loan with no disbursedAt — it has not been disbursed.',
      );
    }

    // Idempotent — safe to call more than once for the same loan.
    const existing = await this.rewardRepository.findByLoanId(loan.id);
    if (existing) {
      return existing;
    }

    const config = await this.rewardConfigRepository.findByCategoryId(categoryId);
    if (!config || !config.isActive) {
      this.logger.info(
        { loanId: loan.id, categoryId },
        'No active reward config for this category — skipping reward generation.',
      );
      return null;
    }

    const principal = Number(loan.principalAmount);
    const percent = Number(config.rewardPercent);
    const rewardAmount = (principal * percent) / 100;

    return this.rewardRepository.create({
      loanId: loan.id,
      customerId: loan.customerId,
      categoryId,
      principalAmount: loan.principalAmount,
      rewardPercent: config.rewardPercent,
      rewardAmount: rewardAmount.toFixed(2),
      status: RewardStatus.ACCRUED,
      disbursedAt: loan.disbursedAt,
    });
  }
}
