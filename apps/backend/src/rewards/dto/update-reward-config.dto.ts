import { IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Admin-only config update (`PATCH /v1/rewards/config`). `categoryId`
 * defaults to `'personal'` in the controller when omitted — today
 * that's the only category with a reward program, but the field stays
 * explicit here rather than hardcoded so a second category's config
 * doesn't need a new endpoint later.
 */
export class UpdateRewardConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  rewardPercent?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerMessage?: string;
}
