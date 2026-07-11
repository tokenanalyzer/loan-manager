import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { CustomerProfileEntity } from '../database/entities';

@Injectable()
export class CustomerProfileRepository extends BaseRepository<CustomerProfileEntity> {
  constructor(
    @InjectRepository(CustomerProfileEntity) repository: Repository<CustomerProfileEntity>,
  ) {
    super(repository);
  }

  async findByUserId(userId: string): Promise<CustomerProfileEntity | null> {
    return this.repository.findOne({ where: { userId } });
  }
}
