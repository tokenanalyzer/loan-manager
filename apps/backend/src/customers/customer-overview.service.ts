import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AuditLogEntity, LeadAssignmentEntity, UserRole } from '../database/entities';
import { DocumentRepository } from '../documents/document.repository';
import { AuditTrailEntryDto } from '../loan-applications/dto/audit-trail-entry.dto';
import { LoanApplicationResponseDto } from '../loan-applications/dto/loan-application-response.dto';
import { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import { UserRepository } from '../users/user.repository';

import { CustomerProfileRepository } from './customer-profile.repository';
import { CustomerOverviewDocumentDto, CustomerOverviewResponseDto } from './dto/customer-overview-response.dto';
import { CustomerProfileResponseDto } from './dto/customer-profile-response.dto';

/**
 * Customer 360 — the aggregate read behind `GET /v1/customers/:id/overview`
 * and `GET /v1/customers/:id/audit-trail`. Deliberately assembled from
 * direct repository injection rather than `LoanApplicationsService`/
 * `DocumentsService` — those services live in modules that already
 * import `CustomersModule` (`LoanJourneyDetectionService` needs
 * `CustomersService`), so depending back on them here would create a
 * module cycle. The repositories themselves are lightweight, stateless
 * TypeORM wrappers — registering them a second time in `CustomersModule`
 * (see `customers.module.ts`) is the same trade-off Phase 3's audit
 * trail already made for `AuditLogEntity`/`LeadAssignmentEntity`.
 */
@Injectable()
export class CustomerOverviewService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly customerProfileRepository: CustomerProfileRepository,
    private readonly loanApplicationRepository: LoanApplicationRepository,
    private readonly documentRepository: DocumentRepository,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
    @InjectRepository(LeadAssignmentEntity)
    private readonly leadAssignmentRepository: Repository<LeadAssignmentEntity>,
  ) {}

  async getOverview(customerId: string): Promise<CustomerOverviewResponseDto> {
    const user = await this.userRepository.findOneById(customerId);
    if (!user || user.role !== UserRole.CUSTOMER) {
      throw new NotFoundException('Customer not found.');
    }

    const [profile, applications, documents] = await Promise.all([
      this.customerProfileRepository.findByUserId(customerId),
      this.loanApplicationRepository.findAllByApplicantWithRelations(customerId),
      this.documentRepository.findAllByOwnerWithDetails(customerId),
    ]);

    const dto = new CustomerOverviewResponseDto();
    dto.id = user.id;
    dto.fullName = user.fullName ?? null;
    dto.email = user.email ?? null;
    dto.phone = user.phone ?? null;
    dto.photoUrl = user.photoUrl ?? null;
    dto.isActive = user.isActive;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    dto.profile = profile ? CustomerProfileResponseDto.fromEntity(profile) : null;
    dto.applications = applications.map((application) => LoanApplicationResponseDto.fromEntity(application));
    dto.documents = documents.map((document) => CustomerOverviewDocumentDto.fromEntity(document));
    return dto;
  }

  /**
   * Customer-scoped Audit Trail — generalizes Phase 3's per-application
   * `LoanApplicationsService.getAuditTrail` to every application this
   * customer has, plus the customer-level `AuditLogEntity` rows
   * `CustomersService` already writes (KYC decisions, account-deletion
   * requests). Same merge-two-real-sources approach, no new writes.
   */
  async getAuditTrail(customerId: string): Promise<AuditTrailEntryDto[]> {
    const user = await this.userRepository.findOneById(customerId);
    if (!user || user.role !== UserRole.CUSTOMER) {
      throw new NotFoundException('Customer not found.');
    }

    const [profile, applications] = await Promise.all([
      this.customerProfileRepository.findByUserId(customerId),
      this.loanApplicationRepository.findAllByApplicant(customerId),
    ]);

    const applicationIds = applications.map((application) => application.id);
    const loanIds = applications
      .map((application) => application.loan?.id)
      .filter((id): id is string => id != null);

    const auditLogWhere: Array<Record<string, unknown>> = [{ entityName: 'users', entityId: customerId }];
    if (profile) {
      auditLogWhere.push({ entityName: 'customer_profiles', entityId: profile.id });
    }
    if (applicationIds.length > 0) {
      auditLogWhere.push({ entityName: 'loan_applications', entityId: In(applicationIds) });
    }
    if (loanIds.length > 0) {
      auditLogWhere.push({ entityName: 'loans', entityId: In(loanIds) });
    }

    const [decisionLogs, assignmentLogs] = await Promise.all([
      this.auditLogRepository.find({ where: auditLogWhere, relations: ['actor'] }),
      applicationIds.length > 0
        ? this.leadAssignmentRepository.find({
            where: { loanApplicationId: In(applicationIds) },
            relations: ['previousAssignee', 'newAssignee', 'assignedBy'],
          })
        : Promise.resolve([]),
    ]);

    const entries = [
      ...decisionLogs.map((log) => AuditTrailEntryDto.fromAuditLog(log)),
      ...assignmentLogs.map((log) => AuditTrailEntryDto.fromAssignment(log)),
    ];
    entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return entries;
  }
}
