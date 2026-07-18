import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentAppUser } from '../auth/decorators/current-app-user.decorator';
import { UserEntity, UserRole } from '../database/entities';

import { EmployeeStatusSummaryResponseDto } from './dto/employee-status-summary-response.dto';
import { EndBreakDto } from './dto/end-break.dto';
import { MyWorkStatusResponseDto } from './dto/my-work-status-response.dto';
import { SetStatusDto } from './dto/set-status.dto';
import { StartBreakDto } from './dto/start-break.dto';
import { WorkStatusService } from './work-status.service';

/**
 * WorkStatusController — Employee Work Status & Break Management.
 * `/me` routes are employee self-service; everything under
 * `/employees` is Admin Override, admin-only.
 */
@Controller({ path: 'work-status', version: '1' })
export class WorkStatusController {
  constructor(private readonly workStatusService: WorkStatusService) {}

  @Get('me')
  @Auth(UserRole.EMPLOYEE)
  async getMyStatus(@CurrentAppUser() user: UserEntity): Promise<MyWorkStatusResponseDto> {
    return this.workStatusService.getMyStatus(user);
  }

  @Post('break/start')
  @Auth(UserRole.EMPLOYEE)
  async startBreak(
    @CurrentAppUser() user: UserEntity,
    @Body() dto: StartBreakDto,
  ): Promise<MyWorkStatusResponseDto> {
    return this.workStatusService.startBreak(user, dto.breakType);
  }

  @Post('break/end')
  @Auth(UserRole.EMPLOYEE)
  async endBreak(@CurrentAppUser() user: UserEntity): Promise<MyWorkStatusResponseDto> {
    return this.workStatusService.endBreak(user);
  }

  @Patch('status')
  @Auth(UserRole.EMPLOYEE)
  async setStatus(
    @CurrentAppUser() user: UserEntity,
    @Body() dto: SetStatusDto,
  ): Promise<MyWorkStatusResponseDto> {
    return this.workStatusService.setStatus(user, dto.status);
  }

  @Get('employees')
  @Auth(UserRole.ADMIN)
  async getAllEmployeeStatuses(): Promise<EmployeeStatusSummaryResponseDto[]> {
    return this.workStatusService.getAllEmployeeStatuses();
  }

  @Patch('employees/:employeeId/end-break')
  @Auth(UserRole.ADMIN)
  async adminEndBreak(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentAppUser() admin: UserEntity,
    @Body() dto: EndBreakDto,
  ): Promise<EmployeeStatusSummaryResponseDto> {
    return this.workStatusService.adminEndBreak(employeeId, admin, dto.forceResume ?? true);
  }

  @Patch('employees/:employeeId/force-logout')
  @Auth(UserRole.ADMIN)
  async forceLogout(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentAppUser() admin: UserEntity,
  ): Promise<{ success: true }> {
    await this.workStatusService.forceLogout(employeeId, admin);
    return { success: true };
  }

  @Patch('employees/:employeeId/disable')
  @Auth(UserRole.ADMIN)
  async disableEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentAppUser() admin: UserEntity,
  ): Promise<{ success: true }> {
    await this.workStatusService.disableEmployee(employeeId, admin);
    return { success: true };
  }
}
