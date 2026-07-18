import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentAppUser } from '../auth/decorators/current-app-user.decorator';
import { UserEntity, UserRole } from '../database/entities';
import { LoanApplicationResponseDto } from '../loan-applications/dto/loan-application-response.dto';

import { AssignLeadDto } from './dto/assign-lead.dto';
import { AssignmentHistoryResponseDto } from './dto/assignment-history-response.dto';
import { EmployeeWorkloadResponseDto } from './dto/employee-workload-response.dto';
import { TransferAllLeadsDto } from './dto/transfer-all-leads.dto';
import { TransferSelectedLeadsDto } from './dto/transfer-selected-leads.dto';
import { LeadAssignmentService } from './lead-assignment.service';

/**
 * LeadAssignmentController — the CRM/Super Admin API surface for the
 * Lead Assignment module. Admin-only across the board: which
 * employee owns a lead is an admin decision, never the employee's or
 * customer's own.
 */
@Controller({ path: 'lead-assignment', version: '1' })
@Auth(UserRole.ADMIN)
export class LeadAssignmentController {
  constructor(private readonly leadAssignmentService: LeadAssignmentService) {}

  @Get('unassigned-leads')
  async getUnassignedLeads(): Promise<LoanApplicationResponseDto[]> {
    const leads = await this.leadAssignmentService.getUnassignedLeads();
    return leads.map((lead) => LoanApplicationResponseDto.fromEntity(lead));
  }

  /** The employee picker's data: identity, presence, and current workload. */
  @Get('employees')
  async getEmployeesWithWorkload(): Promise<EmployeeWorkloadResponseDto[]> {
    return this.leadAssignmentService.getEmployeesWithWorkload();
  }

  @Patch('leads/:id/assign')
  async assignLead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() admin: UserEntity,
    @Body() dto: AssignLeadDto,
  ): Promise<LoanApplicationResponseDto> {
    const application = await this.leadAssignmentService.assignLead(id, dto.employeeId, admin);
    return LoanApplicationResponseDto.fromEntity(application);
  }

  @Patch('leads/transfer')
  async transferSelectedLeads(
    @CurrentAppUser() admin: UserEntity,
    @Body() dto: TransferSelectedLeadsDto,
  ): Promise<{ transferred: number }> {
    return this.leadAssignmentService.transferSelectedLeads(
      dto.applicationIds,
      dto.employeeId,
      admin,
    );
  }

  @Patch('employees/:employeeId/transfer-all')
  async transferAllActiveLeads(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentAppUser() admin: UserEntity,
    @Body() dto: TransferAllLeadsDto,
  ): Promise<{ transferred: number }> {
    return this.leadAssignmentService.transferAllActiveLeads(employeeId, dto.toEmployeeId, admin);
  }

  /**
   * The one endpoint on this admin-only controller also reachable by
   * an employee — Employee Workspace's Activity History/Timeline for
   * their own lead. `@Auth` here overrides the class-level admin-only
   * default; ownership is enforced in the service.
   */
  @Get('leads/:id/history')
  @Auth(UserRole.EMPLOYEE, UserRole.ADMIN)
  async getAssignmentHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() user: UserEntity,
  ): Promise<AssignmentHistoryResponseDto[]> {
    const history = await this.leadAssignmentService.getAssignmentHistory(id, user);
    return history.map((entry) => AssignmentHistoryResponseDto.fromEntity(entry));
  }
}
