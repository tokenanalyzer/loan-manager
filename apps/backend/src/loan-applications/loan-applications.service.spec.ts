import type { DataSource, Repository } from 'typeorm';

import {
  LoanApplicationStatus,
  LoanStatus,
  UserRole,
  type AuditLogEntity,
  type LeadAssignmentEntity,
  type UserEntity,
} from '../database/entities';
import type { DocumentsService } from '../documents/documents.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { RewardsService } from '../rewards/rewards.service';

import type { CaseNumberService } from './case-number.service';
import type { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import type { ReviewLoanApplicationDto } from './dto/review-loan-application.dto';
import type { LoanApplicationRepository } from './loan-application.repository';
import { LoanApplicationsService } from './loan-applications.service';
import type { LoanJourneyDetectionService } from './loan-journey-detection.service';
import type { LoanRepository } from './loan.repository';

/**
 * Submission validation gate — release-blocker fix: `submit()` must
 * consult DocumentsService.getMissingRequiredDocumentsForSubmission
 * before a loan application row is ever created, and must reject with
 * the full missing-document list when it isn't empty. This is
 * deliberately a *presence* check (mirrors the method's own doc
 * comment) — distinct from, and does not replace, the stricter
 * *verified* check `review()` still runs at approval time (tested
 * below) as the existing second safety layer.
 */
describe('LoanApplicationsService.submit — required document validation gate', () => {
  function buildService(missingDocuments: unknown[]) {
    const loanApplicationRepository = {
      create: jest.fn().mockResolvedValue({ id: 'app-1' }),
    } as unknown as LoanApplicationRepository;
    const loanRepository = {} as LoanRepository;
    const notificationsService = {} as NotificationsService;
    const documentsService = {
      getMissingRequiredDocumentsForSubmission: jest.fn().mockResolvedValue(missingDocuments),
    } as unknown as DocumentsService;
    // `submit()` now runs its write path inside `dataSource.transaction`
    // (Case Number generation must commit atomically with the insert) —
    // matching the review/disburse gate tests below, the transactional
    // body itself is out of scope here; these tests only cover the gate.
    const dataSource = {
      transaction: jest.fn().mockResolvedValue(undefined),
    } as unknown as DataSource;
    const loanJourneyDetectionService = {
      detect: jest.fn().mockResolvedValue('fresh_loan'),
    } as unknown as LoanJourneyDetectionService;
    const rewardsService = {} as RewardsService;
    const caseNumberService = {} as CaseNumberService;
    const auditLogRepository = {} as Repository<AuditLogEntity>;
    const leadAssignmentRepository = {} as Repository<LeadAssignmentEntity>;

    const service = new LoanApplicationsService(
      loanApplicationRepository,
      loanRepository,
      notificationsService,
      documentsService,
      dataSource,
      loanJourneyDetectionService,
      rewardsService,
      caseNumberService,
      auditLogRepository,
      leadAssignmentRepository,
    );

    return { service, dataSource, documentsService, loanApplicationRepository };
  }

  const applicant = { id: 'owner-1' } as UserEntity;
  const dto = {
    requestedAmount: 200000,
    requestedTermMonths: 24,
    categoryId: 'business',
  } as CreateLoanApplicationDto;

  it('rejects submission with the full missing-document list when required documents are not uploaded', async () => {
    const missing = [{ code: 'gst', label: 'GST Certificate', reason: 'missing' }];
    const { service, dataSource, documentsService } = buildService(missing);

    await expect(service.submit(applicant, dto)).rejects.toMatchObject({
      response: {
        message: 'Please upload all required documents before submitting your application.',
        missingDocuments: missing,
      },
    });

    expect(documentsService.getMissingRequiredDocumentsForSubmission).toHaveBeenCalledWith(
      'owner-1',
      'business',
    );
    // The gate must run BEFORE any write — no application row (and no Case Number issued) for a submission that fails it.
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('proceeds to the submission transaction once every required document is present', async () => {
    const { service, dataSource, documentsService } = buildService([]);

    await service.submit(applicant, dto);

    expect(documentsService.getMissingRequiredDocumentsForSubmission).toHaveBeenCalledWith(
      'owner-1',
      'business',
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});

/**
 * Approval validation gate — mandatory backend rule (Sprint 1, Item 4):
 * `review()` must consult DocumentsService.getBlockingDocumentsForApproval
 * before an 'approve' decision is allowed to reach the transactional
 * write path, and must reject with the full blocking-document list when
 * it isn't empty. The transactional decision logic itself (Loan
 * creation, notifications, etc.) is pre-existing, already-tested-in-
 * production Phase 5/8 behavior — out of scope here; these tests only
 * cover the new gate.
 */
describe('LoanApplicationsService.review — approval validation gate', () => {
  function buildService(blockingDocuments: unknown[]) {
    const application = {
      id: 'app-1',
      applicantId: 'owner-1',
      categoryId: 'personal',
      status: LoanApplicationStatus.SUBMITTED,
    };

    const loanApplicationRepository = {
      findOneWithLoan: jest.fn().mockResolvedValue(application),
    } as unknown as LoanApplicationRepository;
    const loanRepository = {} as LoanRepository;
    const notificationsService = {} as NotificationsService;
    const documentsService = {
      getBlockingDocumentsForApproval: jest.fn().mockResolvedValue(blockingDocuments),
    } as unknown as DocumentsService;
    const dataSource = {
      transaction: jest.fn().mockResolvedValue(undefined),
    } as unknown as DataSource;
    const loanJourneyDetectionService = {} as LoanJourneyDetectionService;
    const rewardsService = {} as RewardsService;
    const caseNumberService = {} as CaseNumberService;
    const auditLogRepository = {} as Repository<AuditLogEntity>;
    const leadAssignmentRepository = {} as Repository<LeadAssignmentEntity>;

    const service = new LoanApplicationsService(
      loanApplicationRepository,
      loanRepository,
      notificationsService,
      documentsService,
      dataSource,
      loanJourneyDetectionService,
      rewardsService,
      caseNumberService,
      auditLogRepository,
      leadAssignmentRepository,
    );

    return { service, dataSource, documentsService, loanApplicationRepository };
  }

  const reviewer = { id: 'reviewer-1' } as UserEntity;

  it('rejects approval with the full blocking-document list when required documents are not all verified', async () => {
    const blocking = [{ code: 'pan_card', label: 'PAN Card', reason: 'missing' }];
    const { service, dataSource, documentsService } = buildService(blocking);

    await expect(
      service.review('app-1', reviewer, {
        decision: 'approve',
        interestRate: 10,
      } as ReviewLoanApplicationDto),
    ).rejects.toMatchObject({
      response: {
        message: 'Cannot approve — required documents are not fully verified.',
        blockingDocuments: blocking,
      },
    });

    expect(documentsService.getBlockingDocumentsForApproval).toHaveBeenCalledWith('owner-1', 'personal');
    // The gate must run BEFORE any write — no half-applied approval.
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('proceeds to the decision transaction once every required document is verified', async () => {
    const { service, dataSource, documentsService } = buildService([]);

    await service.review('app-1', reviewer, {
      decision: 'approve',
      interestRate: 10,
    } as ReviewLoanApplicationDto);

    expect(documentsService.getBlockingDocumentsForApproval).toHaveBeenCalledWith('owner-1', 'personal');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('does not run the approval gate at all for reject/query decisions', async () => {
    const { service, documentsService } = buildService([{ code: 'pan_card', label: 'PAN Card', reason: 'missing' }]);

    await service.review('app-1', reviewer, {
      decision: 'reject',
      rejectionReason: 'Not eligible.',
    } as ReviewLoanApplicationDto);

    expect(documentsService.getBlockingDocumentsForApproval).not.toHaveBeenCalled();
  });
});

/**
 * Audit Trail — merges two already-real, already-populated sources
 * (`AuditLogEntity` decision rows, `LeadAssignmentEntity` ownership-
 * change rows) into one chronological list, rather than writing to a
 * third table. Covers: both sources are queried and merged/sorted
 * correctly, disbursement rows are found via the loan id (not the
 * application id), and employee ownership is still enforced.
 */
describe('LoanApplicationsService.getAuditTrail', () => {
  function buildService(application: Record<string, unknown> | null) {
    const loanApplicationRepository = {
      findOneWithLoan: jest.fn().mockResolvedValue(application),
    } as unknown as LoanApplicationRepository;
    const loanRepository = {} as LoanRepository;
    const notificationsService = {} as NotificationsService;
    const documentsService = {} as DocumentsService;
    const dataSource = {} as DataSource;
    const loanJourneyDetectionService = {} as LoanJourneyDetectionService;
    const rewardsService = {} as RewardsService;
    const caseNumberService = {} as CaseNumberService;
    const auditLogRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'log-2',
          action: 'loan_application_approved',
          actorId: 'reviewer-1',
          actor: { fullName: 'Reviewer One' },
          metadata: null,
          entityName: 'loan_applications',
          entityId: 'app-1',
          createdAt: new Date('2026-07-20T10:00:00Z'),
        },
        {
          id: 'log-3',
          action: 'loan_disbursed',
          actorId: 'reviewer-1',
          actor: { fullName: 'Reviewer One' },
          metadata: { disbursementReference: 'UTR1' },
          entityName: 'loans',
          entityId: 'loan-1',
          createdAt: new Date('2026-07-21T10:00:00Z'),
        },
      ]),
    } as unknown as Repository<AuditLogEntity>;
    const leadAssignmentRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'assign-1',
          action: 'assign',
          assignedById: 'admin-1',
          assignedBy: { fullName: 'Admin One' },
          previousAssignee: null,
          newAssignee: { fullName: 'Employee One' },
          createdAt: new Date('2026-07-19T10:00:00Z'),
        },
      ]),
    } as unknown as Repository<LeadAssignmentEntity>;

    const service = new LoanApplicationsService(
      loanApplicationRepository,
      loanRepository,
      notificationsService,
      documentsService,
      dataSource,
      loanJourneyDetectionService,
      rewardsService,
      caseNumberService,
      auditLogRepository,
      leadAssignmentRepository,
    );

    return { service, auditLogRepository, leadAssignmentRepository };
  }

  const application = {
    id: 'app-1',
    assignedToId: 'employee-1',
    loan: { id: 'loan-1' },
  };

  it('merges decision and assignment events, newest first, and queries decisions by both the application and loan id', async () => {
    const { service, auditLogRepository } = buildService(application);
    const admin = { id: 'admin-1', role: UserRole.ADMIN } as UserEntity;

    const entries = await service.getAuditTrail('app-1', admin);

    expect(auditLogRepository.find).toHaveBeenCalledWith({
      where: [
        { entityName: 'loan_applications', entityId: 'app-1' },
        { entityName: 'loans', entityId: 'loan-1' },
      ],
      relations: ['actor'],
    });
    expect(entries.map((e) => e.id)).toEqual(['log-3', 'log-2', 'assign-1']);
    expect(entries[0]).toMatchObject({ source: 'decision', actorName: 'Reviewer One' });
    expect(entries[2]).toMatchObject({ source: 'assignment', actorName: 'Admin One' });
  });

  it('throws NotFound when the application does not exist', async () => {
    const { service } = buildService(null);
    const admin = { id: 'admin-1', role: UserRole.ADMIN } as UserEntity;

    await expect(service.getAuditTrail('missing', admin)).rejects.toThrow('Loan application not found.');
  });

  it('forbids an employee the lead is not assigned to', async () => {
    const { service } = buildService(application);
    const otherEmployee = { id: 'employee-2', role: UserRole.EMPLOYEE } as UserEntity;

    await expect(service.getAuditTrail('app-1', otherEmployee)).rejects.toThrow(
      'This lead is not assigned to you.',
    );
  });
});

/**
 * Disbursement gate — Apply → Review → Approve → Disburse. `disburse()`
 * must refuse to run its transactional write path unless the
 * application is APPROVED, has a loan record, that loan is still
 * PENDING, and (for employees) the lead is assigned to the caller.
 * These are the guards this method is responsible for; the write path
 * itself (loan activation, reward generation, notification) runs inside
 * `dataSource.transaction`, asserted here only by call count, matching
 * how the review-gate tests above treat the transactional body as
 * out of scope.
 */
describe('LoanApplicationsService.disburse — disbursement gate', () => {
  function buildService(application: Record<string, unknown> | null) {
    const loanApplicationRepository = {
      findOneWithLoan: jest.fn().mockResolvedValue(application),
    } as unknown as LoanApplicationRepository;
    const loanRepository = {} as LoanRepository;
    const notificationsService = {} as NotificationsService;
    const documentsService = {} as DocumentsService;
    const dataSource = {
      transaction: jest.fn().mockResolvedValue(undefined),
    } as unknown as DataSource;
    const loanJourneyDetectionService = {} as LoanJourneyDetectionService;
    const rewardsService = {} as RewardsService;
    const caseNumberService = {} as CaseNumberService;
    const auditLogRepository = {} as Repository<AuditLogEntity>;
    const leadAssignmentRepository = {} as Repository<LeadAssignmentEntity>;

    const service = new LoanApplicationsService(
      loanApplicationRepository,
      loanRepository,
      notificationsService,
      documentsService,
      dataSource,
      loanJourneyDetectionService,
      rewardsService,
      caseNumberService,
      auditLogRepository,
      leadAssignmentRepository,
    );

    return { service, dataSource, loanApplicationRepository };
  }

  const approvedApplication = {
    id: 'app-1',
    applicantId: 'owner-1',
    categoryId: 'personal',
    status: LoanApplicationStatus.APPROVED,
    assignedToId: 'employee-1',
    loan: { id: 'loan-1', status: LoanStatus.PENDING, termMonths: 24 },
  };

  const dto = { disbursementReference: 'UTR123456' };

  it('throws NotFound when the application does not exist', async () => {
    const { service } = buildService(null);
    await expect(
      service.disburse('missing', { id: 'employee-1', role: UserRole.EMPLOYEE } as UserEntity, dto),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('forbids an employee from disbursing a lead not assigned to them', async () => {
    const { service, dataSource } = buildService(approvedApplication);
    await expect(
      service.disburse('app-1', { id: 'someone-else', role: UserRole.EMPLOYEE } as UserEntity, dto),
    ).rejects.toMatchObject({ status: 403 });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('allows an admin to disburse a lead assigned to someone else', async () => {
    const { service, dataSource } = buildService(approvedApplication);
    await service.disburse('app-1', { id: 'admin-1', role: UserRole.ADMIN } as UserEntity, dto);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects disbursement of an application that is not yet approved', async () => {
    const { service, dataSource } = buildService({
      ...approvedApplication,
      status: LoanApplicationStatus.UNDER_REVIEW,
    });
    await expect(
      service.disburse('app-1', { id: 'employee-1', role: UserRole.EMPLOYEE } as UserEntity, dto),
    ).rejects.toMatchObject({ status: 409 });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects disbursement when the application has no loan record', async () => {
    const { service, dataSource } = buildService({ ...approvedApplication, loan: null });
    await expect(
      service.disburse('app-1', { id: 'employee-1', role: UserRole.EMPLOYEE } as UserEntity, dto),
    ).rejects.toMatchObject({ status: 409 });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects disbursement of a loan that has already been disbursed', async () => {
    const { service, dataSource } = buildService({
      ...approvedApplication,
      loan: { id: 'loan-1', status: LoanStatus.ACTIVE, termMonths: 24 },
    });
    await expect(
      service.disburse('app-1', { id: 'employee-1', role: UserRole.EMPLOYEE } as UserEntity, dto),
    ).rejects.toMatchObject({ status: 409 });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('proceeds to the disbursement transaction once every guard passes', async () => {
    const { service, dataSource, loanApplicationRepository } = buildService(approvedApplication);
    await service.disburse('app-1', { id: 'employee-1', role: UserRole.EMPLOYEE } as UserEntity, dto);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(loanApplicationRepository.findOneWithLoan).toHaveBeenCalledWith('app-1');
  });
});
