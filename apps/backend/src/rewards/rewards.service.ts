import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { EntityManager } from 'typeorm';

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
 * `RewardEntity`. It is called by `LoanApplicationsService.disburse`
 * immediately after setting `loan.status = ACTIVE` and
 * `loan.disbursedAt`, inside the same transaction — this method accepts
 * an optional `EntityManager` for exactly that reason (mirrors
 * `NotificationsService.createForUser`). "No reward before disbursement"
 * is enforced by there being no other code path that can create one.
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

  async generateForDisbursedLoan(
    loan: LoanEntity,
    categoryId: string,
    manager?: EntityManager,
  ): Promise<RewardEntity | null> {
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
    const existing = manager
      ? await manager.findOne(RewardEntity, { where: { loanId: loan.id } })
      : await this.rewardRepository.findByLoanId(loan.id);
    if (existing) {
      return existing;
    }

    const config = manager
      ? await manager.findOne(RewardConfigEntity, { where: { categoryId } })
      : await this.rewardConfigRepository.findByCategoryId(categoryId);
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

    const data = {
      loanId: loan.id,
      customerId: loan.customerId,
      categoryId,
      principalAmount: loan.principalAmount,
      rewardPercent: config.rewardPercent,
      rewardAmount: rewardAmount.toFixed(2),
      status: RewardStatus.ACCRUED,
      disbursedAt: loan.disbursedAt,
    };

    if (manager) {
      return manager.save(manager.create(RewardEntity, data));
    }
    return this.rewardRepository.create(data);
  }
}
