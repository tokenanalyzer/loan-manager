import type { Repository } from 'typeorm';

import { UserRole, type AuditLogEntity, type UserEntity } from '../database/entities';
import type { DocumentRepository } from '../documents/document.repository';
import type { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import type { StorageService } from '../storage/storage.service';
import type { UserRepository } from '../users/user.repository';

import { CustomerDocumentExportService } from './customer-document-export.service';

// `archiver@8` ships as native ESM (its own `index.js` uses `import`),
// which the default CJS Jest transform can't parse from `node_modules`.
// None of the tests below reach the point where `ZipArchive`/`PDFDocument`
// are actually used (they all short-circuit at the access-control guard
// or the very next repository call) — mocking both avoids the ESM
// parse failure entirely rather than widening `transformIgnorePatterns`
// for a dependency this suite never needs to actually load. Jest hoists
// `jest.mock` calls above the imports above at transform time regardless
// of source position, so placing them here (after imports, satisfying
// `import/first`) is equivalent.
jest.mock('archiver', () => ({ ZipArchive: jest.fn() }));
jest.mock('pdfkit', () => jest.fn());

/**
 * "Download All Documents" — access control is the highest-risk piece
 * (it streams every one of a customer's sensitive documents), so these
 * tests cover the guard clauses only: an employee not assigned to this
 * customer must be rejected before any document is touched; a missing/
 * non-customer id 404s. The actual ZIP/PDF streaming path isn't
 * exercised here (would require deeply mocking `archiver`/`pdfkit`/the
 * HTTP response) — it's covered by the live end-to-end check instead.
 */
describe('CustomerDocumentExportService — access control', () => {
  function buildService(customer: Partial<UserEntity> | null, employeeHasAccess: boolean) {
    const userRepository = {
      findOneById: jest.fn().mockResolvedValue(customer),
    } as unknown as UserRepository;
    const loanApplicationRepository = {
      existsAssignedToEmployeeAndApplicant: jest.fn().mockResolvedValue(employeeHasAccess),
      findAllByApplicantWithRelations: jest.fn().mockResolvedValue([]),
    } as unknown as LoanApplicationRepository;
    const documentRepository = {
      findAllByOwnerWithDetails: jest.fn().mockResolvedValue([]),
    } as unknown as DocumentRepository;
    const storageService = {
      getReadStream: jest.fn().mockRejectedValue(new Error('should not be called')),
    } as unknown as StorageService;
    const auditLogRepository = {
      save: jest.fn(),
      create: jest.fn(),
    } as unknown as Repository<AuditLogEntity>;

    const service = new CustomerDocumentExportService(
      userRepository,
      loanApplicationRepository,
      documentRepository,
      storageService,
      auditLogRepository,
    );

    return { service, loanApplicationRepository };
  }

  const customer = { id: 'customer-1', role: UserRole.CUSTOMER, fullName: 'A Customer' };
  const req = { ip: '127.0.0.1' } as never;
  const res = {} as never;

  it('throws NotFound when the id is not a customer', async () => {
    const { service } = buildService(null, false);
    const admin = { id: 'admin-1', role: UserRole.ADMIN } as UserEntity;

    await expect(service.streamDownloadAll('customer-1', admin, req, res)).rejects.toThrow(
      'Customer not found.',
    );
  });

  it('forbids an employee not assigned to any of this customer\'s applications', async () => {
    const { service, loanApplicationRepository } = buildService(customer as UserEntity, false);
    const employee = { id: 'employee-1', role: UserRole.EMPLOYEE } as UserEntity;

    await expect(service.streamDownloadAll('customer-1', employee, req, res)).rejects.toThrow(
      'You do not have access to this customer.',
    );
    expect(loanApplicationRepository.existsAssignedToEmployeeAndApplicant).toHaveBeenCalledWith(
      'employee-1',
      'customer-1',
    );
  });

  it('does not gate an admin on assignment at all — proceeds straight past the guard', async () => {
    const { service, loanApplicationRepository } = buildService(customer as UserEntity, false);
    const admin = { id: 'admin-1', role: UserRole.ADMIN } as UserEntity;
    // Sentinel: reject at the very next step after the guard so reaching
    // it (instead of the ForbiddenException the employee case throws)
    // proves the assignment check was skipped for an admin caller.
    (loanApplicationRepository.findAllByApplicantWithRelations as jest.Mock).mockRejectedValue(
      new Error('reached past the guard'),
    );

    await expect(service.streamDownloadAll('customer-1', admin, req, res)).rejects.toThrow(
      'reached past the guard',
    );
    expect(loanApplicationRepository.existsAssignedToEmployeeAndApplicant).not.toHaveBeenCalled();
  });
});
