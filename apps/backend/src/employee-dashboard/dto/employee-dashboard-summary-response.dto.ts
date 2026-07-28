import { WorkStatus } from '../../database/entities';

/**
 * Employee CRM — the one aggregate a self-service dashboard needs,
 * composed entirely from already-existing repository queries
 * (`LoanApplicationRepository`'s workload counts, the same ones
 * `LeadAssignmentService.getEmployeesWithWorkload` uses for the admin
 * roster view) plus the new `FollowUpRepository` counts and the
 * existing `WorkStatusService.getMyStatus`. No new data model beyond
 * `FollowUpEntity`, already added in sub-phase 0.
 */
export class EmployeeDashboardSummaryResponseDto {
  activeLeadsCount!: number;
  pendingLeadsCount!: number;
  leadsAssignedTodayCount!: number;
  pendingFollowUpsCount!: number;
  followUpsDueTodayCount!: number;
  status!: WorkStatus;
  statusSince!: Date;
  isOnBreak!: boolean;
}
