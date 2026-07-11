import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { NotificationEntity } from '../database/entities';

@Injectable()
export class NotificationRepository extends BaseRepository<NotificationEntity> {
  constructor(@InjectRepository(NotificationEntity) repository: Repository<NotificationEntity>) {
    super(repository);
  }

  async findAllByUser(userId: string): Promise<NotificationEntity[]> {
    return this.repository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }
}
