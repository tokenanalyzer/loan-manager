import { PRESENCE_ONLINE_THRESHOLD_MINUTES } from '../../common/constants/presence.constants';

/**
 * What the admin must see before assigning a lead: identity, live
 * presence, and current workload.
 */
export class EmployeeWorkloadResponseDto {
  id!: string;
  employeeCode!: string | null;
  fullName!: string | null;
  isOnline!: boolean;
  lastActiveAt!: Date | null;
  activeLeadsCount!: number;
  pendingLeadsCount!: number;
  todaysWorkload!: number;

  static fromEntity(
    entity: {
      id: string;
      fullName?: string | null;
      lastActiveAt?: Date | null;
      employeeProfile?: { employeeCode: string } | null;
    },
    counts: { activeLeadsCount: number; pendingLeadsCount: number; todaysWorkload: number },
  ): EmployeeWorkloadResponseDto {
    const dto = new EmployeeWorkloadResponseDto();
    dto.id = entity.id;
    dto.employeeCode = entity.employeeProfile?.employeeCode ?? null;
    dto.fullName = entity.fullName ?? null;
    dto.lastActiveAt = entity.lastActiveAt ?? null;
    dto.isOnline = Boolean(
      entity.lastActiveAt &&
      Date.now() - entity.lastActiveAt.getTime() <= PRESENCE_ONLINE_THRESHOLD_MINUTES * 60_000,
    );
    dto.activeLeadsCount = counts.activeLeadsCount;
    dto.pendingLeadsCount = counts.pendingLeadsCount;
    dto.todaysWorkload = counts.todaysWorkload;
    return dto;
  }
}
