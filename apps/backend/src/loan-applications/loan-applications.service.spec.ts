import type { DataSource } from 'typeorm';

import { LoanApplicationStatus, type UserEntity } from '../database/entities';
import type { DocumentsService } from '../documents/documents.service';
import type { NotificationsService } from '../notifications/notifications.service';

import type { ReviewLoanApplicationDto } from './dto/review-loan-application.dto';
import type { LoanApplicationRepository } from './loan-application.repository';
import { LoanApplicationsService } from './loan-applications.service';
import type { LoanRepository } from './loan.repository';

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

    const service = new LoanApplicationsService(
      loanApplicationRepository,
      loanRepository,
      notificationsService,
      documentsService,
      dataSource,
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
