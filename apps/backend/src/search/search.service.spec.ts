import type { CustomerProfileRepository } from '../customers/customer-profile.repository';
import { UserRole, type UserEntity } from '../database/entities';
import type { DocumentRepository } from '../documents/document.repository';
import type { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import type { UserRepository } from '../users/user.repository';

import { SearchService } from './search.service';

/**
 * Global Search's access-control is the highest-risk piece (it fans a
 * single query across four entity types) — these tests cover: the
 * short-circuit below the minimum query length, and that an Employee
 * caller is scoped to their own assigned customers for Applications/
 * Customers/Documents while the Employees group stays unrestricted.
 */
describe('SearchService', () => {
  function buildService() {
    const loanApplicationRepository = {
      search: jest.fn().mockResolvedValue([]),
      findDistinctApplicantIdsAssignedTo: jest.fn().mockResolvedValue(['customer-1', 'customer-2']),
    } as unknown as LoanApplicationRepository;
    const userRepository = {
      searchCustomers: jest.fn().mockResolvedValue([]),
      searchStaff: jest.fn().mockResolvedValue([]),
    } as unknown as UserRepository;
    const customerProfileRepository = {
      findUserIdsByPanOrAadhaar: jest.fn().mockResolvedValue([]),
    } as unknown as CustomerProfileRepository;
    const documentRepository = {
      search: jest.fn().mockResolvedValue([]),
    } as unknown as DocumentRepository;

    const service = new SearchService(
      loanApplicationRepository,
      userRepository,
      customerProfileRepository,
      documentRepository,
    );

    return { service, loanApplicationRepository, userRepository, documentRepository };
  }

  it('short-circuits below the minimum query length without querying anything', async () => {
    const { service, loanApplicationRepository } = buildService();
    const admin = { id: 'admin-1', role: UserRole.ADMIN } as UserEntity;

    const result = await service.search('a', admin);

    expect(result).toEqual({ applications: [], customers: [], employees: [], documents: [] });
    expect(loanApplicationRepository.search).not.toHaveBeenCalled();
  });

  it('scopes Applications/Customers/Documents to the employee\'s assigned customers, but not Employees', async () => {
    const { service, loanApplicationRepository, userRepository, documentRepository } = buildService();
    const employee = { id: 'employee-1', role: UserRole.EMPLOYEE } as UserEntity;

    await service.search('zainul', employee);

    expect(loanApplicationRepository.findDistinctApplicantIdsAssignedTo).toHaveBeenCalledWith('employee-1');
    expect(loanApplicationRepository.search).toHaveBeenCalledWith('zainul', 8, 'employee-1');
    expect(userRepository.searchCustomers).toHaveBeenCalledWith(
      'zainul',
      8,
      ['customer-1', 'customer-2'],
      [],
    );
    expect(documentRepository.search).toHaveBeenCalledWith('zainul', 8, ['customer-1', 'customer-2']);
    // Employees group is a staff directory — never scoped, admin or employee caller alike.
    expect(userRepository.searchStaff).toHaveBeenCalledWith('zainul', 8);
  });

  it('does not scope an admin caller at all', async () => {
    const { service, loanApplicationRepository, userRepository, documentRepository } = buildService();
    const admin = { id: 'admin-1', role: UserRole.ADMIN } as UserEntity;

    await service.search('zainul', admin);

    expect(loanApplicationRepository.findDistinctApplicantIdsAssignedTo).not.toHaveBeenCalled();
    expect(loanApplicationRepository.search).toHaveBeenCalledWith('zainul', 8, undefined);
    expect(userRepository.searchCustomers).toHaveBeenCalledWith('zainul', 8, undefined, []);
    expect(documentRepository.search).toHaveBeenCalledWith('zainul', 8, undefined);
  });
});
