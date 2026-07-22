import { Body, Controller, Get, NotFoundException, Patch, Query } from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentAppUser } from '../auth/decorators/current-app-user.decorator';
import { UserEntity, UserRole } from '../database/entities';

import { RewardConfigResponseDto } from './dto/reward-config-response.dto';
import { RewardResponseDto } from './dto/reward-response.dto';
import { UpdateRewardConfigDto } from './dto/update-reward-config.dto';
import { RewardsService } from './rewards.service';

const DEFAULT_REWARD_CATEGORY = 'personal';

/**
 * RewardsController — Personal Loan reward program.
 *
 * No `POST` here: a `RewardEntity` is only ever created internally by
 * `RewardsService.generateForDisbursedLoan`, called by a future
 * disbursement workflow — never directly over HTTP by a customer,
 * employee, or admin. See that method's doc comment.
 */
@Controller({ path: 'rewards', version: '1' })
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  /** Public-to-any-authenticated-user config, so the Customer App can show the eligibility message before the customer has any rewards of their own. */
  @Get('config')
  @Auth()
  async getConfig(
    @Query('categoryId') categoryId: string = DEFAULT_REWARD_CATEGORY,
  ): Promise<RewardConfigResponseDto> {
    const config = await this.rewardsService.getConfig(categoryId);
    if (!config) {
      throw new NotFoundException(`No reward config exists for category "${categoryId}".`);
    }
    return RewardConfigResponseDto.fromEntity(config);
  }

  @Patch('config')
  @Auth(UserRole.ADMIN)
  async updateConfig(@Body() dto: UpdateRewardConfigDto): Promise<RewardConfigResponseDto> {
    const updated = await this.rewardsService.updateConfig(
      dto.categoryId ?? DEFAULT_REWARD_CATEGORY,
      dto,
    );
    return RewardConfigResponseDto.fromEntity(updated);
  }

  @Get('me')
  @Auth()
  async listMine(@CurrentAppUser() user: UserEntity): Promise<RewardResponseDto[]> {
    const rewards = await this.rewardsService.listForCustomer(user.id);
    return rewards.map((reward) => RewardResponseDto.fromEntity(reward));
  }
}
