import { PRESENCE_ONLINE_THRESHOLD_MINUTES } from '../../common/constants/presence.constants';
import { WorkStatus } from '../../database/entities';
import { isBreakStatus } from '../work-status.constants';

/**
 * One row of the Admin Portal's Work Status dashboard. `status` is
 * the *effective* status — overridden to OFFLINE when presence
 * (`lastActiveAt`) has gone stale, regardless of what's stored in
 * `employee_profiles.current_status`, so a closed laptop never shows
 * as "on break" forever.
 */
export class EmployeeStatusSummaryResponseDto {
  id!: string;
  employeeCode!: string | null;
  fullName!: string | null;
  isActive!: boolean;
  status!: WorkStatus;
  statusSince!: Date;
  elapsedSeconds!: number;
  isOnBreak!: boolean;

  static fromEntity(entity: {
    id: string;
    fullName?: string | null;
    isActive: boolean;
    lastActiveAt?: Date | null;
    employeeProfile?: {
      employeeCode: string;
      currentStatus: WorkStatus;
      currentStatusSince: Date;
    } | null;
  }): EmployeeStatusSummaryResponseDto {
    const dto = new EmployeeStatusSummaryResponseDto();
    dto.id = entity.id;
    dto.employeeCode = entity.employeeProfile?.employeeCode ?? null;
    dto.fullName = entity.fullName ?? null;
    dto.isActive = entity.isActive;

    const isPresent = Boolean(
      entity.lastActiveAt &&
        Date.now() - entity.lastActiveAt.getTime() <= PRESENCE_ONLINE_THRESHOLD_MINUTES * 60_000,
    );
    const rawStatus = entity.employeeProfile?.currentStatus ?? WorkStatus.OFFLINE;
    dto.status = isPresent ? rawStatus : WorkStatus.OFFLINE;
    dto.statusSince = entity.employeeProfile?.currentStatusSince ?? new Date();
    dto.elapsedSeconds = Math.max(0, Math.floor((Date.now() - dto.statusSince.getTime()) / 1000));
    dto.isOnBreak = isPresent && isBreakStatus(dto.status);
    return dto;
  }
}
