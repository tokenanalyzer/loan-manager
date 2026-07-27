import { ApprovalRequestEntity, ApprovalRequestStatus } from '../../database/entities';

export class ApprovalRequestResponseDto {
  id!: string;
  action!: string;
  status!: ApprovalRequestStatus;
  targetUserId!: string | null;
  targetUserName!: string | null;
  targetUserEmail!: string | null;
  makerId!: string | null;
  makerName!: string | null;
  checkerId!: string | null;
  checkerName!: string | null;
  payload!: Record<string, unknown> | null;
  decisionNote!: string | null;
  failureReason!: string | null;
  createdAt!: Date;
  decidedAt!: Date | null;

  static fromEntity(entity: ApprovalRequestEntity): ApprovalRequestResponseDto {
    const dto = new ApprovalRequestResponseDto();
    dto.id = entity.id;
    dto.action = entity.action;
    dto.status = entity.status;
    dto.targetUserId = entity.targetUserId ?? null;
    dto.targetUserName = entity.targetUser?.fullName ?? entity.targetUser?.email ?? null;
    dto.targetUserEmail = entity.targetUser?.email ?? null;
    dto.makerId = entity.makerId ?? null;
    dto.makerName = entity.maker?.fullName ?? entity.maker?.email ?? null;
    dto.checkerId = entity.checkerId ?? null;
    dto.checkerName = entity.checker?.fullName ?? entity.checker?.email ?? null;
    dto.payload = entity.payload ?? null;
    dto.decisionNote = entity.decisionNote ?? null;
    dto.failureReason = entity.failureReason ?? null;
    dto.createdAt = entity.createdAt;
    dto.decidedAt = entity.decidedAt ?? null;
    return dto;
  }
}

export class PaginatedApprovalRequestResponseDto {
  items!: ApprovalRequestResponseDto[];
  meta!: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
