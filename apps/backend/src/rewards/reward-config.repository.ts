import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { RewardConfigEntity } from '../database/entities';

@Injectable()
export class RewardConfigRepository extends BaseRepository<RewardConfigEntity> {
  constructor(@InjectRepository(RewardConfigEntity) repository: Repository<RewardConfigEntity>) {
    super(repository);
  }

  async findByCategoryId(categoryId: string): Promise<RewardConfigEntity | null> {
    return this.findOne({ categoryId });
  }
}
