import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RewardConfigEntity, RewardEntity } from '../database/entities';

import { RewardConfigRepository } from './reward-config.repository';
import { RewardRepository } from './reward.repository';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

@Module({
  imports: [TypeOrmModule.forFeature([RewardConfigEntity, RewardEntity])],
  controllers: [RewardsController],
  providers: [RewardConfigRepository, RewardRepository, RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
