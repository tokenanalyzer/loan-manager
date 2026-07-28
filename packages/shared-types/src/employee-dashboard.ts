import type { WorkStatus } from './work-status';

/** Employee CRM — mirrors the backend's `EmployeeDashboardSummaryResponseDto`. */
export interface EmployeeDashboardSummary {
  activeLeadsCount: number;
  pendingLeadsCount: number;
  leadsAssignedTodayCount: number;
  pendingFollowUpsCount: number;
  followUpsDueTodayCount: number;
  status: WorkStatus;
  statusSince: string;
  isOnBreak: boolean;
}
