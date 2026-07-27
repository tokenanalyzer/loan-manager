import { forwardRef, Inject, Injectable } from '@nestjs/common';

import { DocumentCategory, UserEntity, UserRole } from '../database/entities';
import { LoanApplicationsService } from '../loan-applications/loan-applications.service';

import { DocumentRepository } from './document.repository';
import { DocumentCenterEntryDto } from './dto/document-center-entry.dto';

/**
 * DocumentCenterService — the Enterprise Document Center's platform-
 * wide listing (`GET /v1/documents/staff`). Deliberately its own small
 * service rather than folded into `DocumentsService` (which already
 * has 700+ lines covering the customer-facing upload/list/delete
 * flow), mirroring the "one service per aggregate concern" precedent
 * `CustomerOverviewService` already set for Customer 360. Reuses
 * `DocumentRepository` (already a provider here) and
 * `LoanApplicationsService` (already available via this module's
 * existing `forwardRef(() => LoanApplicationsModule)`) — no new
 * cross-module wiring needed.
 */
@Injectable()
export class DocumentCenterService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    @Inject(forwardRef(() => LoanApplicationsService))
    private readonly loanApplicationsService: LoanApplicationsService,
  ) {}

  async list(
    requester: UserEntity,
    filters: {
      category?: DocumentCategory;
      verificationStatus?: 'pending' | 'verified' | 'rejected' | 'reupload_requested';
      search?: string;
    },
  ): Promise<DocumentCenterEntryDto[]> {
    const allowedOwnerIds =
      requester.role === UserRole.EMPLOYEE
        ? await this.loanApplicationsService.getAssignedApplicantIds(requester.id)
        : undefined;

    const documents = await this.documentRepository.findAllWithDetails({
      allowedOwnerIds,
      ...filters,
    });

    return documents.map((document) => DocumentCenterEntryDto.fromEntity(document));
  }
}
