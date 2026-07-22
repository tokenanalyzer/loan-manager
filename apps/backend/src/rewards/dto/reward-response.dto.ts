import { RewardEntity, RewardStatus } from '../../database/entities';

export class RewardResponseDto {
  id!: string;
  loanId!: string;
  categoryId!: string;
  principalAmount!: string;
  rewardPercent!: number;
  rewardAmount!: string;
  status!: RewardStatus;
  disbursedAt!: Date;
  paidAt!: Date | null;
  createdAt!: Date;

  static fromEntity(entity: RewardEntity): RewardResponseDto {
    const dto = new RewardResponseDto();
    dto.id = entity.id;
    dto.loanId = entity.loanId;
    dto.categoryId = entity.categoryId;
    dto.principalAmount = entity.principalAmount;
    dto.rewardPercent = Number(entity.rewardPercent);
    dto.rewardAmount = entity.rewardAmount;
    dto.status = entity.status;
    dto.disbursedAt = entity.disbursedAt;
    dto.paidAt = entity.paidAt ?? null;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
