import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';

import {
  LeadAssignmentAction,
  LeadAssignmentEntity,
  LoanApplicationEntity,
  UserEntity,
  UserRole,
} from '../database/entities';
import { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRepository } from '../users/user.repository';

import { EmployeeWorkloadResponseDto } from './dto/employee-workload-response.dto';
import { LeadAssignmentHistoryRepository } from './lead-assignment-history.repository';

/**
 * LeadAssignmentService — the CRM/Super Admin lead-assignment
 * workflow: Unassigned Leads, assign/reassign a single lead, transfer
 * a selected batch, and transfer all of one employee's active leads
 * to another. Every ownership change is written to
 * `LeadAssignmentEntity` (assigned by / to, previous / new employee,
 * timestamp) inside the same transaction as the ownership change
 * itself, and the newly-assigned employee is notified.
 *
 * Admin-only — see `LeadAssignmentController`'s class-level `@Auth`.
 */
@Injectable()
export class LeadAssignmentService {
  constructor(
    private readonly loanApplicationRepository: LoanApplicationRepository,
    private readonly leadAssignmentHistoryRepository: LeadAssignmentHistoryRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationsService: NotificationsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getUnassignedLeads(): Promise<LoanApplicationEntity[]> {
    return this.loanApplicationRepository.findUnassigned();
  }

  async getEmployeesWithWorkload(): Promise<EmployeeWorkloadResponseDto[]> {
    const employees = await this.userRepository.findAllByRoleWithEmployeeProfile(
      UserRole.EMPLOYEE,
    );

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    return Promise.all(
      employees.map(async (employee) => {
        const [activeLeadsCount, pendingLeadsCount, todaysWorkload] = await Promise.all([
          this.loanApplicationRepository.countAssignedTo(employee.id),
          this.loanApplicationRepository.countPendingAssignedTo(employee.id),
          this.loanApplicationRepository.countAssignedToday(employee.id, dayStart, dayEnd),
        ]);

        return EmployeeWorkloadResponseDto.fromEntity(employee, {
          activeLeadsCount,
          pendingLeadsCount,
          todaysWorkload,
        });
      }),
    );
  }

  async assignLead(
    applicationId: string,
    employeeId: string,
    admin: UserEntity,
  ): Promise<LoanApplicationEntity> {
    await this.assertActiveEmployee(employeeId);

    const application = await this.loanApplicationRepository.findOneWithAssignee(applicationId);
    if (!application) {
      throw new NotFoundException('Loan application not found.');
    }

    const previousAssigneeId = application.assignedToId ?? null;
    if (previousAssigneeId === employeeId) {
      throw new ConflictException('This lead is already assigned to that employee.');
    }

    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      await manager.update(LoanApplicationEntity, application.id, {
        assignedToId: employeeId,
        assignedAt: now,
      });

      await manager.save(
        manager.create(LeadAssignmentEntity, {
          loanApplicationId: application.id,
          previousAssigneeId,
          newAssigneeId: employeeId,
          assignedById: admin.id,
          action: previousAssigneeId
            ? LeadAssignmentAction.REASSIGN
            : LeadAssignmentAction.ASSIGN,
        }),
      );

      await this.notificationsService.createForUser(
        {
          userId: employeeId,
          title: 'New lead assigned to you',
          body: 'A loan application has been assigned to you.',
          relatedEntityType: 'loan_application',
          relatedEntityId: application.id,
        },
        manager,
      );
    });

    const updated = await this.loanApplicationRepository.findOneWithAssignee(application.id);
    if (!updated) {
      throw new NotFoundException('Loan application not found after update.');
    }
    return updated;
  }

  async transferSelectedLeads(
    applicationIds: string[],
    employeeId: string,
    admin: UserEntity,
  ): Promise<{ transferred: number }> {
    const uniqueIds = Array.from(new Set(applicationIds));
    await this.assertActiveEmployee(employeeId);

    let transferred = 0;
    await this.dataSource.transaction(async (manager) => {
      for (const applicationId of uniqueIds) {
        const application = await manager.findOne(LoanApplicationEntity, {
          where: { id: applicationId },
        });
        if (!application) {
          throw new NotFoundException(`Loan application ${applicationId} not found.`);
        }

        const previousAssigneeId = application.assignedToId ?? null;
        if (previousAssigneeId === employeeId) {
          continue; // already there — a no-op, not an error, in a bulk action
        }

        const now = new Date();
        await manager.update(LoanApplicationEntity, application.id, {
          assignedToId: employeeId,
          assignedAt: now,
        });

        await manager.save(
          manager.create(LeadAssignmentEntity, {
            loanApplicationId: application.id,
            previousAssigneeId,
            newAssigneeId: employeeId,
            assignedById: admin.id,
            action: LeadAssignmentAction.TRANSFER,
          }),
        );
        transferred += 1;
      }

      if (transferred > 0) {
        await this.notificationsService.createForUser(
          {
            userId: employeeId,
            title: 'Leads transferred to you',
            body: `${transferred} loan application${transferred === 1 ? '' : 's'} transferred to you.`,
            relatedEntityType: 'loan_application',
          },
          manager,
        );
      }
    });

    return { transferred };
  }

  async transferAllActiveLeads(
    fromEmployeeId: string,
    toEmployeeId: string,
    admin: UserEntity,
  ): Promise<{ transferred: number }> {
    if (fromEmployeeId === toEmployeeId) {
      throw new BadRequestException('Source and destination employee must be different.');
    }
    await this.assertActiveEmployee(fromEmployeeId);
    await this.assertActiveEmployee(toEmployeeId);

    const activeLeads = await this.loanApplicationRepository.findActiveAssignedTo(fromEmployeeId);
    if (activeLeads.length === 0) {
      return { transferred: 0 };
    }

    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        LoanApplicationEntity,
        { id: In(activeLeads.map((lead) => lead.id)) },
        { assignedToId: toEmployeeId, assignedAt: now },
      );

      await manager.save(
        activeLeads.map((lead) =>
          manager.create(LeadAssignmentEntity, {
            loanApplicationId: lead.id,
            previousAssigneeId: fromEmployeeId,
            newAssigneeId: toEmployeeId,
            assignedById: admin.id,
            action: LeadAssignmentAction.TRANSFER,
          }),
        ),
      );

      await this.notificationsService.createForUser(
        {
          userId: toEmployeeId,
          title: 'Leads transferred to you',
          body: `${activeLeads.length} active lead${activeLeads.length === 1 ? '' : 's'} transferred to you.`,
          relatedEntityType: 'loan_application',
        },
        manager,
      );
    });

    return { transferred: activeLeads.length };
  }

  /**
   * Also used by the Employee Workspace's Activity History/Timeline
   * (reusing this endpoint rather than duplicating history-assembly
   * logic) — an employee may only view history for a lead currently
   * assigned to them; admins can view any.
   */
  async getAssignmentHistory(
    applicationId: string,
    requester: UserEntity,
  ): Promise<LeadAssignmentEntity[]> {
    const application = await this.loanApplicationRepository.findOneById(applicationId);
    if (!application) {
      throw new NotFoundException('Loan application not found.');
    }
    if (requester.role === UserRole.EMPLOYEE && application.assignedToId !== requester.id) {
      throw new ForbiddenException('This lead is not assigned to you.');
    }
    return this.leadAssignmentHistoryRepository.findAllByApplication(applicationId);
  }

  private async assertActiveEmployee(employeeId: string): Promise<UserEntity> {
    const employee = await this.userRepository.findOneById(employeeId);
    if (!employee || employee.role !== UserRole.EMPLOYEE) {
      throw new NotFoundException('Employee not found.');
    }
    if (!employee.isActive) {
      throw new ConflictException('This employee is disabled and cannot receive new leads.');
    }
    return employee;
  }
}
