import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

import { ApprovalRequestStatus } from '../../database/entities';
import { ApprovalActionType } from '../approval-action-type';

/** Query params for `GET /v1/approvals` — the checker's queue. Defaults to `pending` (the queue's natural default view), not "all statuses". */
export class ListApprovalsQueryDto {
  @IsOptional()
  @IsIn(Object.values(ApprovalRequestStatus))
  status: ApprovalRequestStatus = ApprovalRequestStatus.PENDING;

  @IsOptional()
  @IsIn(Object.values(ApprovalActionType))
  action?: ApprovalActionType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
