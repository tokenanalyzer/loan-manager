import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { formatInr } from '../common/utils/currency.util';
import {
  AuditLogEntity,
  LoanApplicationEntity,
  LoanApplicationStatus,
  LoanEntity,
  LoanStatus,
  UserEntity,
  UserRole,
} from '../database/entities';
import { DocumentsService } from '../documents/documents.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RewardsService } from '../rewards/rewards.service';

import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { DisburseLoanDto } from './dto/disburse-loan.dto';
import { ReviewLoanApplicationDto } from './dto/review-loan-application.dto';
import { UpdateNotesDto } from './dto/update-notes.dto';
import { DEFAULT_LOAN_REQUEST_TYPE, LOAN_CATEGORY_BOUNDS } from './loan-application.constants';
import { LoanApplicationRepository } from './loan-application.repository';
import { LoanJourneyDetectionService } from './loan-journey-detection.service';
import { LoanRepository } from './loan.repository';
import { calculateMaturityDate } from './utils/maturity-date.util';

/**
 * A decided application — approved, rejected, or withdrawn. Used only
 * to gate the Waiting-for-Customer flag (see `setWaitingForCustomer`):
 * distinct from `ACTIVE_LOAN_APPLICATION_STATUSES` in
 * `loan-application.repository.ts`, which is about employee workload
 * counting, not document state.
 */
const TERMINAL_LOAN_APPLICATION_STATUSES = [
  LoanApplicationStatus.APPROVED,
  LoanApplicationStatus.REJECTED,
  LoanApplicationStatus.WITHDRAWN,
];

/**
 * LoanApplicationsService — the loan-form business logic: submission,
 * role-scoped listing, the review workflow (approve creates a real
 * Loan; reject just closes out the application), and disbursement
 * (`disburse` — the final Approve → Disburse step).
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
    // Genuinely mutual with DocumentsService (approval validation gate
    // needs getBlockingDocumentsForApproval) — see DocumentsModule's
    // forwardRef(() => LoanApplicationsModule) comment.
    @Inject(forwardRef(() => DocumentsService)) private readonly documentsService: DocumentsService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly loanJourneyDetectionService: LoanJourneyDetectionService,
    private readonly rewardsService: RewardsService,
  ) {}

  async submit(
    applicant: UserEntity,
    dto: CreateLoanApplicationDto,
  ): Promise<LoanApplicationEntity> {
    if (dto.categoryId) {
      const bounds = LOAN_CATEGORY_BOUNDS[dto.categoryId];
      if (!bounds) {
        throw new BadRequestException(`Unknown loan category: ${dto.categoryId}.`);
      }
      if (dto.requestedAmount < bounds.minAmount || dto.requestedAmount > bounds.maxAmount) {
        throw new BadRequestException(
          `Requested amount must be between ${bounds.minAmount} and ${bounds.maxAmount} for this loan category.`,
        );
      }
      if (
        dto.requestedTermMonths < bounds.minTermMonths ||
        dto.requestedTermMonths > bounds.maxTermMonths
      ) {
        throw new BadRequestException(
          `Term must be between ${bounds.minTermMonths} and ${bounds.maxTermMonths} months for this loan category.`,
        );
      }
    }

    // Personal Loan journey (Fresh/Top-Up/Balance Transfer/BT+Top-Up)
    // is server-detected, not client-chosen — a client-sent
    // `requestType` is ignored for `categoryId === 'personal'` so a
    // stale/malicious client value can never override what the
    // customer's actual data says. Every other category still falls
    // back to the client value (or the default) exactly as before,
    // since detection only applies to Personal Loans.
    const requestType =
      dto.categoryId === 'personal'
        ? await this.loanJourneyDetectionService.detect(applicant.id, dto.categoryId)
        : dto.requestType ?? DEFAULT_LOAN_REQUEST_TYPE;

    return this.loanApplicationRepository.create({
      applicantId: applicant.id,
      requestedAmount: dto.requestedAmount.toFixed(2),
      requestedTermMonths: dto.requestedTermMonths,
      purpose: dto.purpose ?? null,
      categoryId: dto.categoryId ?? null,
      requestType,
      status: LoanApplicationStatus.SUBMITTED,
      submittedAt: new Date(),
      propertyType: dto.propertyType ?? null,
      propertyOwnership: dto.propertyOwnership ?? null,
      propertyAddress: dto.propertyAddress ?? null,
      propertyValue: dto.propertyValue != null ? dto.propertyValue.toFixed(2) : null,
      hasExistingLoanOnProperty: dto.hasExistingLoanOnProperty ?? null,
      existingLoanOutstandingAmount:
        dto.existingLoanOutstandingAmount != null ? dto.existingLoanOutstandingAmount.toFixed(2) : null,
    });
  }

  /**
   * Customers see only their own applications. Employees — per the
   * Lead Assignment module — see only leads assigned to them, never
   * unassigned leads or leads assigned to other employees. Admins
   * still see everything, since assignment/reassignment is their job.
   */
  async findAllForUser(user: UserEntity): Promise<LoanApplicationEntity[]> {
    if (user.role === UserRole.CUSTOMER) {
      return this.loanApplicationRepository.findAllByApplicant(user.id);
    }
    if (user.role === UserRole.EMPLOYEE) {
      return this.loanApplicationRepository.findAllAssignedTo(user.id);
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

    if (user.role === UserRole.EMPLOYEE && application.assignedToId !== user.id) {
      throw new ForbiddenException('This lead is not assigned to you.');
    }

    return application;
  }

  /**
   * Document Management Center's Secure Access / Role-based
   * Permissions — an employee may view/verify a customer's documents
   * only if assigned to at least one of that customer's leads (any
   * status; a decided lead's documents stay reachable for the record).
   */
  async isEmployeeAssignedToCustomer(employeeId: string, customerId: string): Promise<boolean> {
    return this.loanApplicationRepository.existsAssignedToEmployeeAndApplicant(
      employeeId,
      customerId,
    );
  }

  /**
   * Employee Workspace — replaces the lead's internal note. Ownership
   * is re-checked here (not just at the controller's `@Auth`) for the
   * same reason as `findOneForUser`: this is the "Lead Locking"
   * guarantee — if the lead gets reassigned away from this employee
   * mid-session, the next autosave 403s instead of silently writing
   * notes onto a lead that's no longer theirs.
   */
  async updateNotes(
    id: string,
    employee: UserEntity,
    dto: UpdateNotesDto,
  ): Promise<LoanApplicationEntity> {
    const application = await this.loanApplicationRepository.findOneWithLoan(id);
    if (!application) {
      throw new NotFoundException('Loan application not found.');
    }
    if (application.assignedToId !== employee.id) {
      throw new ForbiddenException('This lead is not assigned to you.');
    }

    await this.loanApplicationRepository.update(id, {
      internalNotes: dto.notes,
      internalNotesUpdatedAt: new Date(),
    });

    const updated = await this.loanApplicationRepository.findOneWithLoan(id);
    if (!updated) {
      throw new NotFoundException('Loan application not found after update.');
    }
    return updated;
  }

  /**
   * Approve, reject, or raise a query on a submitted application.
   *
   * Approval creates a real LoanEntity linked back to this
   * application (loanNumber generated, principal/term copied from the
   * requested values, interest rate supplied by the reviewer) and
   * marks the application APPROVED. Rejection marks it REJECTED
   * (final — no further customer action). Raising a query marks it
   * QUERY_RAISED and notifies the customer with the reviewer's
   * message; the customer re-uploads documents to respond, which
   * `resolveQueriesForCustomer` picks up and moves the application
   * back to UNDER_REVIEW for another look. Every decision writes an
   * AuditLogEntity row, and `reviewedById`/`reviewedAt` (or
   * `queryRaisedById`/`queryRaisedAt`) are stamped from the reviewer's
   * own identity — never from client-supplied data.
   *
   * Approval is additionally gated on every required document (for
   * this application's category) being `verified` — mandatory,
   * backend-enforced (DocumentsService.getBlockingDocumentsForApproval),
   * not a UI-only check a client could bypass.
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
    if (dto.decision === 'query' && !dto.queryMessage) {
      throw new ConflictException('queryMessage is required to raise a query.');
    }

    if (dto.decision === 'approve') {
      const blockingDocuments = await this.documentsService.getBlockingDocumentsForApproval(
        application.applicantId,
        application.categoryId ?? undefined,
      );
      if (blockingDocuments.length > 0) {
        throw new ConflictException({
          message: 'Cannot approve — required documents are not fully verified.',
          blockingDocuments,
        });
      }
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

        await manager.save(
          manager.create(AuditLogEntity, {
            actorId: reviewer.id,
            action: 'loan_application_approved',
            entityName: 'loan_applications',
            entityId: application.id,
          }),
        );

        await this.notificationsService.createForUser(
          {
            userId: application.applicantId,
            title: 'Loan application approved',
            body: `Your application for ${formatInr(application.requestedAmount)} has been approved.`,
            relatedEntityType: 'loan_application',
            relatedEntityId: application.id,
          },
          manager,
        );
        return;
      }

      if (dto.decision === 'query') {
        await manager.update(LoanApplicationEntity, application.id, {
          status: LoanApplicationStatus.QUERY_RAISED,
          queryMessage: dto.queryMessage,
          queryRaisedById: reviewer.id,
          queryRaisedAt: now,
          queryRespondedAt: null,
        });

        await manager.save(
          manager.create(AuditLogEntity, {
            actorId: reviewer.id,
            action: 'loan_application_query_raised',
            entityName: 'loan_applications',
            entityId: application.id,
            metadata: { queryMessage: dto.queryMessage },
          }),
        );

        await this.notificationsService.createForUser(
          {
            userId: application.applicantId,
            title: 'Action needed on your application',
            body: dto.queryMessage!,
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
        rejectionReason: dto.rejectionReason ?? null,
      });

      await manager.save(
        manager.create(AuditLogEntity, {
          actorId: reviewer.id,
          action: 'loan_application_rejected',
          entityName: 'loan_applications',
          entityId: application.id,
          metadata: { rejectionReason: dto.rejectionReason ?? null },
        }),
      );

      await this.notificationsService.createForUser(
        {
          userId: application.applicantId,
          title: 'Loan application update',
          body:
            `Your application for ${formatInr(application.requestedAmount)} was not approved this time.` +
            (dto.rejectionReason ? ` ${dto.rejectionReason}` : ''),
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

  /**
   * Disburse an approved loan — the final step of Apply → Review →
   * Approve → Disburse. The actual bank transfer happens outside this
   * system (there is no payment-gateway integration); this records
   * proof that it happened (a bank transaction reference) and flips
   * the loan PENDING → ACTIVE, the one fact every downstream feature
   * keys off of: `RewardsService.generateForDisbursedLoan` (Personal
   * Loan rewards) and `LoanRepository.hasActivePersonalLoan` (Top-Up
   * journey detection) both require `LoanStatus.ACTIVE` — until this
   * method runs, neither could ever fire, by construction.
   *
   * Employees may only disburse loans on leads assigned to them (same
   * ownership rule as `findOneForUser`) — unlike `review`, this check
   * is enforced explicitly here since disbursement is the one action
   * with real financial consequence.
   */
  async disburse(id: string, actor: UserEntity, dto: DisburseLoanDto): Promise<LoanApplicationEntity> {
    const application = await this.loanApplicationRepository.findOneWithLoan(id);
    if (!application) {
      throw new NotFoundException('Loan application not found.');
    }

    if (actor.role === UserRole.EMPLOYEE && application.assignedToId !== actor.id) {
      throw new ForbiddenException('This lead is not assigned to you.');
    }

    if (application.status !== LoanApplicationStatus.APPROVED) {
      throw new ConflictException(
        `Only approved applications can be disbursed (status: ${application.status}).`,
      );
    }
    if (!application.loan) {
      throw new ConflictException('This application has no loan record to disburse.');
    }
    if (application.loan.status !== LoanStatus.PENDING) {
      throw new ConflictException(
        `This loan has already been disbursed (status: ${application.loan.status}).`,
      );
    }

    const loanId = application.loan.id;
    const termMonths = application.loan.termMonths;
    const categoryId = application.categoryId ?? undefined;

    await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const maturityDate = calculateMaturityDate(now, termMonths);

      await manager.update(LoanEntity, loanId, {
        status: LoanStatus.ACTIVE,
        disbursedAt: now,
        maturityDate,
        disbursementReference: dto.disbursementReference,
        disbursedById: actor.id,
        disbursementNotes: dto.remarks ?? null,
      });

      const disbursedLoan = await manager.findOneOrFail(LoanEntity, { where: { id: loanId } });

      await manager.save(
        manager.create(AuditLogEntity, {
          actorId: actor.id,
          action: 'loan_disbursed',
          entityName: 'loans',
          entityId: loanId,
          metadata: {
            applicationId: application.id,
            disbursementReference: dto.disbursementReference,
          },
        }),
      );

      await this.notificationsService.createForUser(
        {
          userId: application.applicantId,
          title: 'Loan disbursed',
          body: `Your loan of ${formatInr(disbursedLoan.principalAmount)} has been disbursed to your registered bank account.`,
          relatedEntityType: 'loan_application',
          relatedEntityId: application.id,
        },
        manager,
      );

      if (categoryId) {
        await this.rewardsService.generateForDisbursedLoan(disbursedLoan, categoryId, manager);
      }
    });

    const updated = await this.loanApplicationRepository.findOneWithLoan(application.id);
    if (!updated) {
      throw new NotFoundException('Loan application not found after update.');
    }
    return updated;
  }

  /**
   * Waiting-for-Customer visibility — a secondary flag representing
   * document verification status ONLY, fully independent of `status`
   * (which represents application/business review status — e.g.
   * QUERY_RAISED for an income/employment/banking clarification that
   * has nothing to do with documents). The two can be true/set at the
   * same time without contradiction: a QUERY_RAISED application can
   * also have a `reupload_requested` document, and this flag must
   * still reflect that accurately. Excluded only for applications that
   * are already *decided* (`TERMINAL_LOAN_APPLICATION_STATUSES`) — a
   * closed application never needs this, no matter what state its
   * documents are in. `status` itself is never touched here. Documents
   * aren't scoped to a specific application (same as
   * `resolveQueriesForCustomer` below), so this applies across every
   * one of the customer's non-terminal applications. Accepts an
   * optional transactional `EntityManager` so it can participate in
   * the caller's transaction (e.g. DocumentsService.updateVerification).
   */
  async setWaitingForCustomer(
    applicantId: string,
    waiting: boolean,
    manager?: EntityManager,
  ): Promise<void> {
    const em = manager ?? this.dataSource.manager;
    const qb = em.createQueryBuilder().update(LoanApplicationEntity).where('applicant_id = :applicantId', {
      applicantId,
    });

    if (waiting) {
      await qb
        .set({
          waitingForCustomer: true,
          // Only stamp the timestamp the first time it flips true — a
          // second document going to reupload_requested while one is
          // already outstanding shouldn't reset "how long has this
          // been waiting" for staff.
          waitingForCustomerSince: () => 'COALESCE(waiting_for_customer_since, now())',
        })
        .andWhere('status NOT IN (:...statuses)', { statuses: TERMINAL_LOAN_APPLICATION_STATUSES })
        .execute();
    } else {
      await qb.set({ waitingForCustomer: false, waitingForCustomerSince: null }).execute();
    }
  }

  /**
   * Called by DocumentsService after a customer uploads/replaces a
   * document — documents aren't scoped to a specific application, so
   * this resolves *every* QUERY_RAISED application for that customer
   * back to UNDER_REVIEW, on the assumption a re-upload is the
   * customer's response to whatever was queried. Notifies the
   * assigned employee so it reappears as needing another look.
   */
  async resolveQueriesForCustomer(customerId: string): Promise<void> {
    const queried = await this.loanApplicationRepository.findAllByApplicantAndStatus(
      customerId,
      LoanApplicationStatus.QUERY_RAISED,
    );
    if (queried.length === 0) {
      return;
    }

    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      for (const application of queried) {
        await manager.update(LoanApplicationEntity, application.id, {
          status: LoanApplicationStatus.UNDER_REVIEW,
          queryRespondedAt: now,
        });

        await manager.save(
          manager.create(AuditLogEntity, {
            actorId: customerId,
            action: 'loan_application_query_responded',
            entityName: 'loan_applications',
            entityId: application.id,
          }),
        );

        if (application.assignedToId) {
          await this.notificationsService.createForUser(
            {
              userId: application.assignedToId,
              title: 'Customer responded to your query',
              body: 'The customer re-uploaded documents — this lead is ready for another look.',
              relatedEntityType: 'loan_application',
              relatedEntityId: application.id,
            },
            manager,
          );
        }
      }
    });
  }
}
