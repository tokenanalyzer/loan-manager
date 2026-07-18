import { IsIn } from 'class-validator';

import { WorkStatus } from '../../database/entities';
import { MANUAL_NON_BREAK_STATUSES } from '../work-status.constants';

export class SetStatusDto {
  @IsIn(MANUAL_NON_BREAK_STATUSES)
  status!: WorkStatus;
}
