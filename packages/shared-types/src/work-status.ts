/**
 * Employee Work Status & Break Management domain types — mirrors the
 * backend's `WorkStatus` enum (`apps/backend/src/database/entities/enums.ts`)
 * and the `work-status` module's response DTOs.
 */

export type WorkStatus =
  | 'online'
  | 'busy'
  | 'tea_break'
  | 'lunch_break'
  | 'meeting'
  | 'training'
  | 'away'
  | 'offline';

export const BREAK_WORK_STATUSES: WorkStatus[] = [
  'tea_break',
  'lunch_break',
  'meeting',
  'training',
  'away',
];

/** The employee's own status — drives the Employee Portal's Break Mode gate. */
export interface MyWorkStatus {
  status: WorkStatus;
  statusSince: string;
  isOnBreak: boolean;
}

/** One row of the Admin Portal's Work Status dashboard. */
export interface EmployeeStatusSummary {
  id: string;
  employeeCode: string | null;
  fullName: string | null;
  isActive: boolean;
  status: WorkStatus;
  statusSince: string;
  elapsedSeconds: number;
  isOnBreak: boolean;
}
