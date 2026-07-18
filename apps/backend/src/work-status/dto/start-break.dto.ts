import { IsIn } from 'class-validator';

import { WorkStatus } from '../../database/entities';
import { BREAK_WORK_STATUSES } from '../work-status.constants';

export class StartBreakDto {
  @IsIn(BREAK_WORK_STATUSES)
  breakType!: WorkStatus;
}
