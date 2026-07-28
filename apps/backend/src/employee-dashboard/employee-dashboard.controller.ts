import { Controller, Get } from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentAppUser } from '../auth/decorators/current-app-user.decorator';
import { UserEntity, UserRole } from '../database/entities';

import { EmployeeDashboardSummaryResponseDto } from './dto/employee-dashboard-summary-response.dto';
import { EmployeeDashboardService } from './employee-dashboard.service';

/** Employee CRM — a single self-service dashboard aggregate. Deliberately its own small module, not bolted onto WorkStatusController (which is cleanly scoped to work-status only). */
@Controller({ path: 'employee-dashboard', version: '1' })
export class EmployeeDashboardController {
  constructor(private readonly employeeDashboardService: EmployeeDashboardService) {}

  @Get('summary')
  @Auth(UserRole.EMPLOYEE)
  async getSummary(@CurrentAppUser() employee: UserEntity): Promise<EmployeeDashboardSummaryResponseDto> {
    return this.employeeDashboardService.getSummary(employee);
  }
}
