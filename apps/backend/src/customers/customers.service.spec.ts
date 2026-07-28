import type { Repository } from 'typeorm';

import { AuditLogEntity, UserRole } from '../database/entities';
import type { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import type { NotificationsService } from '../notifications/notifications.service';
import type { UserRepository } from '../users/user.repository';

import { CustomersService } from './customers.service';
import type { CustomerProfileRepository } from './customer-profile.repository';

/**
 * Employee CRM: `listCustomers` previously returned every customer to
 * any EMPLOYEE caller — these tests cover the new assignment-scoping,
 * following the same mock-repository pattern
 * `document-center.service.spec.ts`/`search.service.spec.ts` already
 * use for the identical scoping primitive.
 */
describe('CustomersService.listCustomers', () => {
  function buildService(overrides: { findAllByRole?: jest.Mock; findDistinctApplicantIdsAssignedTo?: jest.Mock }) {
    const findAllByRole = overrides.findAllByRole ?? jest.fn().mockResolvedValue([]);
    const userRepository = { findAllByRole } as unknown as UserRepository;

    const findDistinctApplicantIdsAssignedTo =
      overrides.findDistinctApplicantIdsAssignedTo ?? jest.fn().mockResolvedValue([]);
    const loanApplicationRepository = {
      findDistinctApplicantIdsAssignedTo,
    } as unknown as LoanApplicationRepository;

    const service = new CustomersService(
      {} as CustomerProfileRepository,
      userRepository,
      {} as NotificationsService,
      loanApplicationRepository,
      {} as Repository<AuditLogEntity>,
    );

    return { service, findAllByRole, findDistinctApplicantIdsAssignedTo };
  }

  it('scopes an employee caller to their assigned customers', async () => {
    const findDistinctApplicantIdsAssignedTo = jest.fn().mockResolvedValue(['customer-1', 'customer-2']);
    const { service, findAllByRole } = buildService({ findDistinctApplicantIdsAssignedTo });

    await service.listCustomers({ id: 'employee-1', role: UserRole.EMPLOYEE } as never);

    expect(findDistinctApplicantIdsAssignedTo).toHaveBeenCalledWith('employee-1');
    expect(findAllByRole).toHaveBeenCalledWith(UserRole.CUSTOMER, ['customer-1', 'customer-2']);
  });

  it('does not scope an admin caller', async () => {
    const findDistinctApplicantIdsAssignedTo = jest.fn();
    const { service, findAllByRole } = buildService({ findDistinctApplicantIdsAssignedTo });

    await service.listCustomers({ id: 'admin-1', role: UserRole.ADMIN } as never);

    expect(findDistinctApplicantIdsAssignedTo).not.toHaveBeenCalled();
    expect(findAllByRole).toHaveBeenCalledWith(UserRole.CUSTOMER, undefined);
  });
});
