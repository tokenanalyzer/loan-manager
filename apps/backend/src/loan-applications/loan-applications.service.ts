import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
  LoanApplicationEntity,
  LoanApplicationStatus,
  LoanEntity,
  LoanStatus,
  UserEntity,
  UserRole,
} from '../database/entities';
import { NotificationsService } from '../notifications/notifications.service';

import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { ReviewLoanApplicationDto } from './dto/review-loan-application.dto';
import { LoanApplicationRepository } from './loan-application.repository';
import { LoanRepository } from './loan.repository';

/**
 * LoanApplicationsService — the loan-form business logic: submission,
 * role-scoped listing, and the review workflow (approve creates a
 * real Loan; reject just closes out the application).
 *
 * Phase 5 scope: this is the first module in the project with real
 * business rules and state transitions. Phase 6 adds a real
 * notification on every decision (see `review`), consumed by the
 * Customer App's notifications list.
 *
 * Phase 8 hardening: the review() decision path now runs inside a
 * single database transaction (via the injected DataSource). Approving
 * previously performed three separate writes — create loan, update
 * application, create notification — with no atomicity; a failure
 * between them could leave an APPROVED application with no Loan row, or
 * a Loan with the application still SUBMITTED. All decision-path writes
 * now commit together or not at all. The existing repositories are
 * unchanged — only this orchestration method was wrapped, so the
 * repository-pattern architecture is preserved.
 */
@Injectable()
export class LoanApplicationsService {
  constructor(
    private readonly loanApplicationRepository: LoanApplicationRepository,
    private readonly loanRepository: LoanRepository,
    private readonly notificationsService: NotificationsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async submit(
    applicant: UserEntity,
    dto: CreateLoanApplicationDto,
  ): Promise<LoanApplicationEntity> {
    return this.loanApplicationRepository.create({
      applicantId: applicant.id,
      requestedAmount: dto.requestedAmount.toFixed(2),
      requestedTermMonths: dto.requestedTermMonths,
      purpose: dto.purpose ?? null,
      status: LoanApplicationStatus.SUBMITTED,
      submittedAt: new Date(),
    });
  }

  /** Customers see only their own applications; staff see everything. */
  async findAllForUser(user: UserEntity): Promise<LoanApplicationEntity[]> {
    if (user.role === UserRole.CUSTOMER) {
      return this.loanApplicationRepository.findAllByApplicant(user.id);
    }
    return this.loanApplicationRepository.findAllForReview();
  }

  async findOneForUser(id: string, user: UserEntity): Promise<LoanApplicationEntity> {
    const application = await this.loanApplicationRepository.findOneWithLoan(id);
    if (!application) {
      throw new NotFoundException('Loan application not found.');
    }

    if (user.role === UserRole.CUSTOMER && application.applicantId !== user.id) {
      throw new ForbiddenException('You do not have access to this loan application.');
    }

    return application;
  }

  /**
   * Approve or reject a submitted application.
   *
   * Approval creates a real LoanEntity linked back to this
   * application (loanNumber generated, principal/term copied from the
   * requested values, interest rate supplied by the reviewer) and
   * marks the application APPROVED. Rejection just marks it REJECTED.
   * Either way, `reviewedById`/`reviewedAt` are stamped from the
   * reviewer's own identity — never from client-supplied data.
   */
  async review(
    id: string,
    reviewer: UserEntity,
    dto: ReviewLoanApplicationDto,
  ): Promise<LoanApplicationEntity> {
    const application = await this.loanApplicationRepository.findOneWithLoan(id);
    if (!application) {
      throw new NotFoundException('Loan application not found.');
    }

    if (
      application.status !== LoanApplicationStatus.SUBMITTED &&
      application.status !== LoanApplicationStatus.UNDER_REVIEW
    ) {
      throw new ConflictException(
        `This application has already been decided (status: ${application.status}).`,
      );
    }

    if (dto.decision === 'approve' && dto.interestRate === undefined) {
      // Also enforced by ReviewLoanApplicationDto's @ValidateIf, kept
      // here too as a defensive guard against the DTO changing later.
      throw new ConflictException('interestRate is required to approve an application.');
    }

    // All decision-path writes run atomically. If any step throws, the
    // whole decision rolls back — no half-applied approvals (Loan
    // created but application not marked APPROVED, or vice versa).
    await this.dataSource.transaction(async (manager) => {
      const now = new Date();

      if (dto.decision === 'approve') {
        const loan = manager.create(LoanEntity, {
          loanNumber: this.loanRepository.generateLoanNumber(),
          applicationId: application.id,
          customerId: application.applicantId,
          createdById: reviewer.id,
          principalAmount: application.requestedAmount,
          interestRate: dto.interestRate!.toFixed(3),
          termMonths: application.requestedTermMonths,
          status: LoanStatus.PENDING,
        });
        await manager.save(loan);

        await manager.update(LoanApplicationEntity, application.id, {
          status: LoanApplicationStatus.APPROVED,
          reviewedById: reviewer.id,
          reviewedAt: now,
        });

        await this.notificationsService.createForUser(
          {
            userId: application.applicantId,
            title: 'Loan application approved',
            body: `Your application for $${application.requestedAmount} has been approved.`,
            relatedEntityType: 'loan_application',
            relatedEntityId: application.id,
          },
          manager,
        );
        return;
      }

      await manager.update(LoanApplicationEntity, application.id, {
        status: LoanApplicationStatus.REJECTED,
        reviewedById: reviewer.id,
        reviewedAt: now,
      });

      await this.notificationsService.createForUser(
        {
          userId: application.applicantId,
          title: 'Loan application update',
          body: `Your application for $${application.requestedAmount} was not approved this time.`,
          relatedEntityType: 'loan_application',
          relatedEntityId: application.id,
        },
        manager,
      );
    });

    const updated = await this.loanApplicationRepository.findOneWithLoan(application.id);
    if (!updated) {
      throw new NotFoundException('Loan application not found after update.');
    }
    return updated;
  }
}
