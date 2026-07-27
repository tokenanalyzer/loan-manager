import { Injectable } from '@nestjs/common';

import { CustomerProfileRepository } from '../customers/customer-profile.repository';
import { UserEntity, UserRole, type DocumentEntity, type LoanApplicationEntity } from '../database/entities';
import { DocumentRepository } from '../documents/document.repository';
import { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import { UserRepository } from '../users/user.repository';

import { SearchResponseDto, SearchResultDto } from './dto/search-result.dto';

const RESULTS_PER_GROUP = 8;
const MIN_QUERY_LENGTH = 2;

/**
 * Global Search — one query fanned out across four already-real
 * sources (applications, customers, employees, documents), each
 * queried directly via its own repository rather than through
 * `LoanApplicationsService`/`DocumentsService` (both of those modules
 * already depend on `CustomersModule`, so a service-level dependency
 * back here would risk a module cycle — see `SearchModule`'s doc
 * comment, same trade-off Phase 3/4's audit-trail work already made).
 *
 * Employee callers are scoped to their own assigned customers for the
 * Applications/Customers/Documents groups (mirrors the existing "Lead
 * Locking" access model everywhere else in this app); the Employees
 * group — a staff directory lookup — is unrestricted for any staff
 * caller, admin or employee.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly loanApplicationRepository: LoanApplicationRepository,
    private readonly userRepository: UserRepository,
    private readonly customerProfileRepository: CustomerProfileRepository,
    private readonly documentRepository: DocumentRepository,
  ) {}

  async search(query: string, requester: UserEntity): Promise<SearchResponseDto> {
    const trimmed = query.trim();
    const response = new SearchResponseDto();
    response.applications = [];
    response.customers = [];
    response.employees = [];
    response.documents = [];

    if (trimmed.length < MIN_QUERY_LENGTH) {
      return response;
    }

    const employeeScope = requester.role === UserRole.EMPLOYEE ? requester.id : undefined;
    const allowedCustomerIds = employeeScope
      ? await this.loanApplicationRepository.findDistinctApplicantIdsAssignedTo(employeeScope)
      : undefined;

    const [applications, panAadhaarMatchIds, employees] = await Promise.all([
      this.loanApplicationRepository.search(trimmed, RESULTS_PER_GROUP, employeeScope),
      this.customerProfileRepository.findUserIdsByPanOrAadhaar(trimmed),
      this.userRepository.searchStaff(trimmed, RESULTS_PER_GROUP),
    ]);

    const [customers, documents] = await Promise.all([
      this.userRepository.searchCustomers(trimmed, RESULTS_PER_GROUP, allowedCustomerIds, panAadhaarMatchIds),
      this.documentRepository.search(trimmed, RESULTS_PER_GROUP, allowedCustomerIds),
    ]);

    response.applications = applications.map(toApplicationResult);
    response.customers = customers.map(toCustomerResult);
    response.employees = employees.map(toEmployeeResult);
    response.documents = documents.map(toDocumentResult);
    return response;
  }
}

function toApplicationResult(application: LoanApplicationEntity): SearchResultDto {
  const dto = new SearchResultDto();
  dto.type = 'application';
  dto.id = application.id;
  dto.title = application.caseNumber;
  dto.subtitle = application.applicant?.fullName ?? null;
  // Raw enum value — the frontend already owns the enum→label mapping
  // (`LEAD_STATUS_LABELS`) and applies it here, same as every other
  // application list in this app; not duplicated server-side.
  dto.statusLabel = application.status;
  dto.caseNumber = application.caseNumber;
  dto.ownerId = null;
  return dto;
}

function toCustomerResult(user: UserEntity): SearchResultDto {
  const dto = new SearchResultDto();
  dto.type = 'customer';
  dto.id = user.id;
  dto.title = user.fullName ?? user.email ?? user.phone ?? 'Unknown customer';
  dto.subtitle = [user.email, user.phone].filter(Boolean).join(' · ') || null;
  dto.statusLabel = user.isActive ? 'Active' : 'Inactive';
  dto.caseNumber = null;
  dto.ownerId = null;
  return dto;
}

function toEmployeeResult(user: UserEntity): SearchResultDto {
  const dto = new SearchResultDto();
  dto.type = 'employee';
  dto.id = user.id;
  dto.title = user.fullName ?? user.email ?? 'Unknown staff member';
  dto.subtitle = user.employeeProfile?.employeeCode ?? user.email ?? null;
  dto.statusLabel = user.role;
  dto.caseNumber = null;
  dto.ownerId = null;
  return dto;
}

function toDocumentResult(document: DocumentEntity): SearchResultDto {
  const dto = new SearchResultDto();
  dto.type = 'document';
  dto.id = document.id;
  dto.title = document.originalFileName;
  dto.subtitle = [document.documentTypeRef?.label, document.owner?.fullName].filter(Boolean).join(' · ') || null;
  dto.statusLabel = document.verificationStatus;
  dto.caseNumber = null;
  dto.ownerId = document.ownerId;
  return dto;
}
