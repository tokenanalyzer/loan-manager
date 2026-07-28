import { Injectable } from '@nestjs/common';

import { UserEntity } from '../database/entities';
import { FollowUpRepository } from '../follow-ups/follow-up.repository';
import { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import { WorkStatusService } from '../work-status/work-status.service';

import { EmployeeDashboardSummaryResponseDto } from './dto/employee-dashboard-summary-response.dto';

@Injectable()
export class EmployeeDashboardService {
  constructor(
    // Duplicated lightweight repository providers — same "avoid a
    // module cycle / keep feature modules shallow" pattern
    // CustomersModule/FollowUpsModule already use. WorkStatusService
    // is a real service dependency (not just a repository read) since
    // its status-mapping logic (isBreakStatus) is genuine business
    // logic worth reusing, not duplicating.
    private readonly loanApplicationRepository: LoanApplicationRepository,
    private readonly followUpRepository: FollowUpRepository,
    private readonly workStatusService: WorkStatusService,
  ) {}

  async getSummary(employee: UserEntity): Promise<EmployeeDashboardSummaryResponseDto> {
    // Same UTC-day-boundary convention as
    // LeadAssignmentService.getEmployeesWithWorkload's "today's
    // workload" — mirrored here rather than duplicated as a shared
    // util, since it's a two-line computation used in exactly two
    // places.
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const [
      activeLeadsCount,
      pendingLeadsCount,
      leadsAssignedTodayCount,
      pendingFollowUpsCount,
      followUpsDueTodayCount,
      myStatus,
    ] = await Promise.all([
      this.loanApplicationRepository.countAssignedTo(employee.id),
      this.loanApplicationRepository.countPendingAssignedTo(employee.id),
      this.loanApplicationRepository.countAssignedToday(employee.id, dayStart, dayEnd),
      this.followUpRepository.countPendingForEmployee(employee.id),
      this.followUpRepository.countDueTodayForEmployee(employee.id, dayStart, dayEnd),
      this.workStatusService.getMyStatus(employee),
    ]);

    const dto = new EmployeeDashboardSummaryResponseDto();
    dto.activeLeadsCount = activeLeadsCount;
    dto.pendingLeadsCount = pendingLeadsCount;
    dto.leadsAssignedTodayCount = leadsAssignedTodayCount;
    dto.pendingFollowUpsCount = pendingFollowUpsCount;
    dto.followUpsDueTodayCount = followUpsDueTodayCount;
    dto.status = myStatus.status;
    dto.statusSince = myStatus.statusSince;
    dto.isOnBreak = myStatus.isOnBreak;
    return dto;
  }
}
