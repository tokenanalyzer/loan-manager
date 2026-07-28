import { WorkStatus, type UserEntity } from '../database/entities';
import type { FollowUpRepository } from '../follow-ups/follow-up.repository';
import type { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import type { WorkStatusService } from '../work-status/work-status.service';

import { EmployeeDashboardService } from './employee-dashboard.service';

describe('EmployeeDashboardService.getSummary', () => {
  it('composes counts from the loan-application, follow-up, and work-status sources for the caller', async () => {
    const countAssignedTo = jest.fn().mockResolvedValue(6);
    const countPendingAssignedTo = jest.fn().mockResolvedValue(3);
    const countAssignedToday = jest.fn().mockResolvedValue(2);
    const loanApplicationRepository = {
      countAssignedTo,
      countPendingAssignedTo,
      countAssignedToday,
    } as unknown as LoanApplicationRepository;

    const countPendingForEmployee = jest.fn().mockResolvedValue(4);
    const countDueTodayForEmployee = jest.fn().mockResolvedValue(1);
    const followUpRepository = {
      countPendingForEmployee,
      countDueTodayForEmployee,
    } as unknown as FollowUpRepository;

    const getMyStatus = jest.fn().mockResolvedValue({
      status: WorkStatus.ONLINE,
      statusSince: new Date('2026-07-28T09:00:00.000Z'),
      isOnBreak: false,
    });
    const workStatusService = { getMyStatus } as unknown as WorkStatusService;

    const service = new EmployeeDashboardService(loanApplicationRepository, followUpRepository, workStatusService);
    const employee = { id: 'employee-1' } as unknown as UserEntity;

    const summary = await service.getSummary(employee);

    expect(countAssignedTo).toHaveBeenCalledWith('employee-1');
    expect(countPendingAssignedTo).toHaveBeenCalledWith('employee-1');
    expect(countAssignedToday).toHaveBeenCalledWith('employee-1', expect.any(Date), expect.any(Date));
    expect(countPendingForEmployee).toHaveBeenCalledWith('employee-1');
    expect(countDueTodayForEmployee).toHaveBeenCalledWith('employee-1', expect.any(Date), expect.any(Date));
    expect(getMyStatus).toHaveBeenCalledWith(employee);

    expect(summary).toMatchObject({
      activeLeadsCount: 6,
      pendingLeadsCount: 3,
      leadsAssignedTodayCount: 2,
      pendingFollowUpsCount: 4,
      followUpsDueTodayCount: 1,
      status: WorkStatus.ONLINE,
      isOnBreak: false,
    });
  });
});
