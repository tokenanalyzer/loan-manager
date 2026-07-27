import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { ApprovalRequestEntity, ApprovalRequestStatus } from '../database/entities';

@Injectable()
export class ApprovalRequestRepository extends BaseRepository<ApprovalRequestEntity> {
  constructor(@InjectRepository(ApprovalRequestEntity) repository: Repository<ApprovalRequestEntity>) {
    super(repository);
  }

  /** Backs the duplicate-request check (`ApprovalsService.createRequest`) — the app-level half of the guard the partial unique index backstops at the DB level. */
  async findPending(targetUserId: string, action: string): Promise<ApprovalRequestEntity | null> {
    return this.repository.findOne({
      where: { targetUserId, action, status: ApprovalRequestStatus.PENDING },
    });
  }

  /** One pending request per target at most (enforced by the same partial unique index) — used to decorate the Team list with a "pending approval" badge. */
  async findPendingByTargetIds(targetUserIds: string[]): Promise<ApprovalRequestEntity[]> {
    if (targetUserIds.length === 0) {
      return [];
    }
    return this.repository.find({
      where: { targetUserId: In(targetUserIds), status: ApprovalRequestStatus.PENDING },
    });
  }

  /** The checker's queue — defaults the caller doesn't specify are applied by `ApprovalsService`. */
  async findQueue(params: {
    status?: ApprovalRequestStatus;
    action?: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: ApprovalRequestEntity[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.targetUser', 'targetUser')
      .leftJoinAndSelect('request.maker', 'maker')
      .leftJoinAndSelect('request.checker', 'checker')
      .orderBy('request.createdAt', 'DESC');

    if (params.status) {
      qb.andWhere('request.status = :status', { status: params.status });
    }
    if (params.action) {
      qb.andWhere('request.action = :action', { action: params.action });
    }

    qb.skip((params.page - 1) * params.pageSize).take(params.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findByMaker(makerId: string): Promise<ApprovalRequestEntity[]> {
    return this.repository.find({
      where: { makerId },
      order: { createdAt: 'DESC' },
      relations: ['targetUser', 'checker'],
    });
  }

  async findOneWithRelations(id: string): Promise<ApprovalRequestEntity | null> {
    return this.repository.findOne({ where: { id }, relations: ['targetUser', 'maker', 'checker'] });
  }
}
