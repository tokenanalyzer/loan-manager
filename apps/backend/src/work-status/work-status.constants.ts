import { WorkStatus } from '../database/entities';

/** Starting any of these puts the Employee Portal into Break Mode. */
export const BREAK_WORK_STATUSES: WorkStatus[] = [
  WorkStatus.TEA_BREAK,
  WorkStatus.LUNCH_BREAK,
  WorkStatus.MEETING,
  WorkStatus.TRAINING,
  WorkStatus.AWAY,
];

/** Manually settable statuses that do *not* trigger Break Mode. */
export const MANUAL_NON_BREAK_STATUSES: WorkStatus[] = [WorkStatus.ONLINE, WorkStatus.BUSY];

export function isBreakStatus(status: WorkStatus): boolean {
  return BREAK_WORK_STATUSES.includes(status);
}
