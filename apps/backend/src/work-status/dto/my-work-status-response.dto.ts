import { WorkStatus } from '../../database/entities';
import { isBreakStatus } from '../work-status.constants';

/** The employee's own status — drives the Employee Portal's Break Mode gate. */
export class MyWorkStatusResponseDto {
  status!: WorkStatus;
  statusSince!: Date;
  isOnBreak!: boolean;

  static fromEntity(profile: {
    currentStatus: WorkStatus;
    currentStatusSince: Date;
  }): MyWorkStatusResponseDto {
    const dto = new MyWorkStatusResponseDto();
    dto.status = profile.currentStatus;
    dto.statusSince = profile.currentStatusSince;
    dto.isOnBreak = isBreakStatus(profile.currentStatus);
    return dto;
  }
}
