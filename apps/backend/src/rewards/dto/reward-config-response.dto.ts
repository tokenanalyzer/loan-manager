import { RewardConfigEntity } from '../../database/entities';

export class RewardConfigResponseDto {
  categoryId!: string;
  rewardPercent!: number;
  isActive!: boolean;
  customerMessage!: string;

  static fromEntity(entity: RewardConfigEntity): RewardConfigResponseDto {
    const dto = new RewardConfigResponseDto();
    dto.categoryId = entity.categoryId;
    dto.rewardPercent = Number(entity.rewardPercent);
    dto.isActive = entity.isActive;
    dto.customerMessage = entity.customerMessage;
    return dto;
  }
}
