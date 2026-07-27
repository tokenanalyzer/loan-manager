import { UserRole, type UserEntity } from '../database/entities';
import type { LoanApplicationsService } from '../loan-applications/loan-applications.service';

import { DocumentCenterService } from './document-center.service';
import type { DocumentRepository } from './document.repository';

/**
 * The Enterprise Document Center's access control is the highest-risk
 * piece (it lists every document platform-wide) — covers: an Employee
 * caller is scoped to their assigned customers' documents only, an
 * Admin caller sees everything, and filters pass through unchanged.
 */
describe('DocumentCenterService', () => {
  function buildService() {
    const documentRepository = {
      findAllWithDetails: jest.fn().mockResolvedValue([]),
    } as unknown as DocumentRepository;
    const loanApplicationsService = {
      getAssignedApplicantIds: jest.fn().mockResolvedValue(['customer-1', 'customer-2']),
    } as unknown as LoanApplicationsService;

    const service = new DocumentCenterService(documentRepository, loanApplicationsService);
    return { service, documentRepository, loanApplicationsService };
  }

  it('scopes an employee caller to their assigned customers', async () => {
    const { service, documentRepository, loanApplicationsService } = buildService();
    const employee = { id: 'employee-1', role: UserRole.EMPLOYEE } as UserEntity;

    await service.list(employee, { search: 'pan' });

    expect(loanApplicationsService.getAssignedApplicantIds).toHaveBeenCalledWith('employee-1');
    expect(documentRepository.findAllWithDetails).toHaveBeenCalledWith({
      allowedOwnerIds: ['customer-1', 'customer-2'],
      search: 'pan',
    });
  });

  it('does not scope an admin caller at all', async () => {
    const { service, documentRepository, loanApplicationsService } = buildService();
    const admin = { id: 'admin-1', role: UserRole.ADMIN } as UserEntity;

    await service.list(admin, { category: 'identity' as never });

    expect(loanApplicationsService.getAssignedApplicantIds).not.toHaveBeenCalled();
    expect(documentRepository.findAllWithDetails).toHaveBeenCalledWith({
      allowedOwnerIds: undefined,
      category: 'identity',
    });
  });
});
