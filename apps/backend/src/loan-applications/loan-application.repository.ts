import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { LoanApplicationEntity, LoanApplicationStatus } from '../database/entities';

/** Statuses that still represent open, actionable work for whoever it's assigned to. */
export const ACTIVE_LOAN_APPLICATION_STATUSES = [
  LoanApplicationStatus.SUBMITTED,
  LoanApplicationStatus.UNDER_REVIEW,
];

@Injectable()
export class LoanApplicationRepository extends BaseRepository<LoanApplicationEntity> {
  constructor(
    @InjectRepository(LoanApplicationEntity) repository: Repository<LoanApplicationEntity>,
  ) {
    super(repository);
  }

  async findAllByApplicant(applicantId: string): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: { applicantId },
      order: { submittedAt: 'DESC' },
      relations: ['loan'],
    });
  }

  /** Used by the Customer↔Employee query workflow to find what a document re-upload should resolve. */
  async findAllByApplicantAndStatus(
    applicantId: string,
    status: LoanApplicationStatus,
  ): Promise<LoanApplicationEntity[]> {
    return this.repository.find({ where: { applicantId, status } });
  }

  /** Document Management Center — an employee may only access a customer's documents if assigned to at least one of their leads (any status, so historical access survives a later decision). */
  async existsAssignedToEmployeeAndApplicant(
    employeeId: string,
    applicantId: string,
  ): Promise<boolean> {
    const count = await this.repository.count({ where: { assignedToId: employeeId, applicantId } });
    return count > 0;
  }

  /** Admin-only (see LoanApplicationsService.findAllForUser) — loads assignment/applicant info for the Lead Assignment screens. */
  async findAllForReview(): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      order: { submittedAt: 'ASC' },
      relations: ['loan', 'applicant', 'assignedTo'],
    });
  }

  /** Employees/admins only ever see leads assigned to that one employee. */
  async findAllAssignedTo(employeeId: string): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: { assignedToId: employeeId },
      order: { assignedAt: 'DESC' },
      relations: ['loan', 'applicant'],
    });
  }

  async findOneWithLoan(id: string): Promise<LoanApplicationEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['loan', 'loan.disbursedBy', 'applicant', 'reviewedBy', 'queryRaisedBy'],
    });
  }

  async findOneWithAssignee(id: string): Promise<LoanApplicationEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['applicant', 'assignedTo'],
    });
  }

  /** The CRM/Super Admin "Unassigned Leads" screen — newest submissions first. */
  async findUnassigned(): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: { assignedToId: IsNull() },
      order: { submittedAt: 'ASC' },
      relations: ['applicant'],
    });
  }

  async findActiveAssignedTo(employeeId: string): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: { assignedToId: employeeId, status: In(ACTIVE_LOAN_APPLICATION_STATUSES) },
      relations: ['applicant'],
    });
  }

  async countAssignedTo(employeeId: string): Promise<number> {
    return this.repository.count({
      where: { assignedToId: employeeId, status: In(ACTIVE_LOAN_APPLICATION_STATUSES) },
    });
  }

  async countPendingAssignedTo(employeeId: string): Promise<number> {
    return this.repository.count({
      where: { assignedToId: employeeId, status: LoanApplicationStatus.SUBMITTED },
    });
  }

  /** "Today's Workload" — leads handed to this employee today. */
  async countAssignedToday(employeeId: string, dayStart: Date, dayEnd: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('application')
      .where('application.assigned_to_id = :employeeId', { employeeId })
      .andWhere('application.assigned_at >= :dayStart', { dayStart })
      .andWhere('application.assigned_at < :dayEnd', { dayEnd })
      .getCount();
  }
}
