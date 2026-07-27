import type { Repository } from 'typeorm';

import { UserRole, type AuditLogEntity, type LeadAssignmentEntity, type UserEntity } from '../database/entities';
import type { DocumentRepository } from '../documents/document.repository';
import type { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import type { UserRepository } from '../users/user.repository';

import { CustomerOverviewService } from './customer-overview.service';
import type { CustomerProfileRepository } from './customer-profile.repository';

/**
 * Customer 360's aggregate reads — `getOverview` reuses existing
 * response DTOs as-is (see the service's own doc comment), so the main
 * risk worth testing here is `getAuditTrail`'s query construction: it
 * must scope `AuditLogEntity` by both the customer's own rows
 * (`users`/`customer_profiles`) and every one of their applications'
 * rows (`loan_applications`/`loans`), and merge in `LeadAssignmentEntity`
 * rows — the same merge-two-sources approach Phase 3 already covers
 * for a single application, generalized to "every application this
 * customer has."
 */
describe('CustomerOverviewService', () => {
  function buildService(customer: Partial<UserEntity> | null) {
    const userRepository = {
      findOneById: jest.fn().mockResolvedValue(customer),
    } as unknown as UserRepository;
    const customerProfileRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'profile-1' }),
    } as unknown as CustomerProfileRepository;
    const loanApplicationRepository = {
      findAllByApplicant: jest.fn().mockResolvedValue([
        { id: 'app-1', loan: { id: 'loan-1' } },
        { id: 'app-2', loan: null },
      ]),
      findAllByApplicantWithRelations: jest.fn().mockResolvedValue([]),
    } as unknown as LoanApplicationRepository;
    const documentRepository = {
      findAllByOwnerWithDetails: jest.fn().mockResolvedValue([]),
    } as unknown as DocumentRepository;
    const auditLogRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'log-1',
          action: 'account_deletion_requested',
          actorId: 'customer-1',
          actor: { fullName: 'A Customer' },
          metadata: null,
          createdAt: new Date('2026-07-01T10:00:00Z'),
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
          createdAt: new Date('2026-07-02T10:00:00Z'),
        },
      ]),
    } as unknown as Repository<LeadAssignmentEntity>;

    const service = new CustomerOverviewService(
      userRepository,
      customerProfileRepository,
      loanApplicationRepository,
      documentRepository,
      auditLogRepository,
      leadAssignmentRepository,
    );

    return { service, userRepository, auditLogRepository, leadAssignmentRepository };
  }

  const customer = { id: 'customer-1', role: UserRole.CUSTOMER, fullName: 'A Customer' };

  it('getOverview throws NotFound when the id is not a customer', async () => {
    const { service } = buildService(null);
    await expect(service.getOverview('customer-1')).rejects.toThrow('Customer not found.');
  });

  it('getAuditTrail scopes AuditLogEntity by the customer, their profile, and every one of their applications/loans', async () => {
    const { service, auditLogRepository } = buildService(customer as UserEntity);

    await service.getAuditTrail('customer-1');

    const [{ where }] = (auditLogRepository.find as jest.Mock).mock.calls[0];
    expect(where).toEqual(
      expect.arrayContaining([
        { entityName: 'users', entityId: 'customer-1' },
        { entityName: 'customer_profiles', entityId: 'profile-1' },
      ]),
    );
    // In() conditions carry their own operator object — assert the shape rather than deep-equality.
    expect(where.find((w: { entityName: string }) => w.entityName === 'loan_applications')).toBeDefined();
    expect(where.find((w: { entityName: string }) => w.entityName === 'loans')).toBeDefined();
  });

  it('getAuditTrail merges decision and assignment events, newest first', async () => {
    const { service } = buildService(customer as UserEntity);

    const entries = await service.getAuditTrail('customer-1');

    expect(entries.map((e) => e.id)).toEqual(['assign-1', 'log-1']);
  });

  it('getAuditTrail throws NotFound when the id is not a customer', async () => {
    const { service } = buildService(null);
    await expect(service.getAuditTrail('customer-1')).rejects.toThrow('Customer not found.');
  });
});
