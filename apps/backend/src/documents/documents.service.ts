import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AuditLogEntity,
  DocumentEntity,
  DocumentType,
  UserEntity,
  UserRole,
} from '../database/entities';
import { LoanApplicationsService } from '../loan-applications/loan-applications.service';
import { StorageService } from '../storage/storage.service';

import { DocumentTypeRepository } from './document-type.repository';
import { DocumentRepository } from './document.repository';
import { DocumentAuditEntryDto } from './dto/document-audit-response.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import {
  DocumentCategoryGroupDto,
  DocumentsOverviewResponseDto,
  DocumentTypeOverviewDto,
} from './dto/documents-overview-response.dto';
import { UpdateDocumentVerificationDto } from './dto/update-document-verification.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

/** Fixed display order for the 6 categories — the one place this app agrees "identity comes first." */
const CATEGORY_ORDER = [
  'identity',
  'income',
  'employment',
  'balance_transfer',
  'loan_specific',
  'other',
] as const;

/**
 * The 6 legacy `DocumentType` enum values, by code — used only to
 * keep the deprecated `documents.document_type` column populated for
 * backward compatibility. New catalog codes with no legacy analog
 * fall back to `OTHER`.
 */
const LEGACY_ENUM_BY_CODE: Record<string, DocumentType> = {
  pan_card: DocumentType.PAN_CARD,
  aadhaar_card: DocumentType.AADHAAR_CARD,
  address_proof: DocumentType.ADDRESS_PROOF,
  id_proof: DocumentType.ID_PROOF,
  income_proof: DocumentType.INCOME_PROOF,
  other: DocumentType.OTHER,
};

/**
 * DocumentsService — the customer-facing upload/list/delete flow.
 *
 * Phase 2 (Customer App production sprint) rewrite: every "which
 * types exist / which are required / how many slots / which loan
 * category" decision now comes from the `document_types` catalog
 * table at request time (`DocumentTypeRepository`), not a compiled-in
 * list — a new catalog row (inserted by a future Admin Panel via
 * `DocumentTypesService`) is uploadable and shows up in `getOverview`
 * immediately, with zero changes here.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly documentTypeRepository: DocumentTypeRepository,
    private readonly storageService: StorageService,
    private readonly loanApplicationsService: LoanApplicationsService,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  /**
   * Categories → types → upload slots, cross-referenced against the
   * customer's own documents. `categoryId` (a loan-application
   * category id, e.g. `home`) additionally includes `loan_specific`
   * types tagged for that category; omit it for the general
   * (non-application-scoped) Documents tab view.
   */
  async getOverview(user: UserEntity, categoryId?: string): Promise<DocumentsOverviewResponseDto> {
    return this.buildOverview(user.id, categoryId);
  }

  /**
   * Staff read-only equivalent of `getOverview` — same catalog ×
   * uploads cross-reference, keyed by an explicit customer id instead
   * of the caller's own id. No ownership check: callers are gated to
   * `UserRole.EMPLOYEE`/`ADMIN` at the controller (see
   * `DocumentsController`'s `staff/customer/:customerId` route).
   */
  async getOverviewForCustomer(
    customerId: string,
    categoryId?: string,
  ): Promise<DocumentsOverviewResponseDto> {
    return this.buildOverview(customerId, categoryId);
  }

  private async buildOverview(
    ownerId: string,
    categoryId?: string,
  ): Promise<DocumentsOverviewResponseDto> {
    const [types, documents] = await Promise.all([
      this.documentTypeRepository.findAllActive(),
      this.documentRepository.findAllByOwner(ownerId),
    ]);

    const relevantTypes = types.filter((type) => {
      if (!type.applicableLoanCategoryIds || type.applicableLoanCategoryIds.length === 0) {
        return true;
      }
      return categoryId != null && type.applicableLoanCategoryIds.includes(categoryId);
    });

    const documentsByTypeCode = new Map<string, DocumentEntity[]>();
    for (const document of documents) {
      const list = documentsByTypeCode.get(document.documentTypeCode) ?? [];
      list.push(document);
      documentsByTypeCode.set(document.documentTypeCode, list);
    }

    const groupsByCategory = new Map<string, DocumentTypeOverviewDto[]>();
    for (const type of relevantTypes) {
      const uploadedForType = documentsByTypeCode.get(type.code) ?? [];

      const typeDto = new DocumentTypeOverviewDto();
      typeDto.code = type.code;
      typeDto.label = type.label;
      typeDto.isRequired = type.isRequired;
      typeDto.maxUploads = type.maxUploads;
      typeDto.slots = Array.from({ length: type.maxUploads }, (_, index) => {
        const slotIndex = index + 1;
        const match = uploadedForType.find((doc) => doc.slotIndex === slotIndex);
        return {
          slotIndex,
          isUploaded: Boolean(match),
          document: match ? DocumentResponseDto.fromEntity(match) : undefined,
        };
      });

      const bucket = groupsByCategory.get(type.category) ?? [];
      bucket.push(typeDto);
      groupsByCategory.set(type.category, bucket);
    }

    const categories: DocumentCategoryGroupDto[] = CATEGORY_ORDER.filter((category) =>
      groupsByCategory.has(category),
    ).map((category) => {
      const group = new DocumentCategoryGroupDto();
      group.category = category as DocumentCategoryGroupDto['category'];
      group.types = groupsByCategory.get(category)!;
      return group;
    });

    const overview = new DocumentsOverviewResponseDto();
    overview.categories = categories;
    return overview;
  }

  /**
   * Uploads a document into a specific (or auto-assigned) slot.
   * Uploading into an already-occupied slot replaces it — this is
   * what makes "replace document" work, same as the original
   * single-slot behavior, just slot-aware now.
   *
   * Also the customer's side of the Raise Query workflow: any upload
   * resolves every one of this customer's QUERY_RAISED applications
   * back to UNDER_REVIEW (see `LoanApplicationsService.
   * resolveQueriesForCustomer` — documents aren't scoped to a specific
   * application, so a re-upload is treated as "responded to whatever
   * was queried").
   */
  async upload(
    user: UserEntity,
    dto: UploadDocumentDto,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<DocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('No file was provided.');
    }

    const type = await this.documentTypeRepository.findByCode(dto.documentTypeCode);
    if (!type || !type.isActive) {
      throw new BadRequestException(`Unknown or inactive document type: ${dto.documentTypeCode}.`);
    }

    let slotIndex = dto.slotIndex;
    if (slotIndex != null) {
      if (slotIndex < 1 || slotIndex > type.maxUploads) {
        throw new BadRequestException(
          `slotIndex must be between 1 and ${type.maxUploads} for ${type.code}.`,
        );
      }
    } else {
      const existing = await this.documentRepository.findAllByOwner(user.id);
      const occupiedSlots = new Set(
        existing.filter((doc) => doc.documentTypeCode === type.code).map((doc) => doc.slotIndex),
      );
      const freeSlot = Array.from({ length: type.maxUploads }, (_, index) => index + 1).find(
        (candidate) => !occupiedSlots.has(candidate),
      );
      if (freeSlot == null) {
        throw new ConflictException(
          `All ${type.maxUploads} upload slot(s) for ${type.label} are full — specify slotIndex to replace one.`,
        );
      }
      slotIndex = freeSlot;
    }

    const existingAtSlot = await this.documentRepository.findByOwnerTypeAndSlot(
      user.id,
      type.code,
      slotIndex,
    );

    const stored = await this.storageService.save({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: `documents/${user.id}`,
    });

    if (existingAtSlot) {
      await this.storageService.delete(existingAtSlot.storagePath);
      const updated = await this.documentRepository.update(existingAtSlot.id, {
        storagePath: stored.storagePath,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: String(file.size),
        uploadedAt: new Date(),
      });
      if (!updated) {
        throw new NotFoundException('Document not found after update.');
      }
      await this.loanApplicationsService.resolveQueriesForCustomer(user.id);
      return DocumentResponseDto.fromEntity(updated);
    }

    const created = await this.documentRepository.create({
      ownerId: user.id,
      documentType: LEGACY_ENUM_BY_CODE[type.code] ?? DocumentType.OTHER,
      documentTypeCode: type.code,
      slotIndex,
      storagePath: stored.storagePath,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: String(file.size),
      uploadedAt: new Date(),
    });
    await this.loanApplicationsService.resolveQueriesForCustomer(user.id);
    return DocumentResponseDto.fromEntity(created);
  }

  /** Deletes a document outright — storage file + row. Ownership-checked. */
  async delete(user: UserEntity, documentId: string): Promise<void> {
    const document = await this.getOwnedDocumentOrThrow(user, documentId);
    await this.storageService.delete(document.storagePath);
    await this.documentRepository.deleteById(document.id);
  }

  /** Returns the entity (with storagePath) for streaming — ownership-checked. */
  async getOwnedDocumentOrThrow(user: UserEntity, documentId: string): Promise<DocumentEntity> {
    const document = await this.documentRepository.findOneById(documentId);
    if (!document) {
      throw new NotFoundException('Document not found.');
    }
    if (document.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this document.');
    }
    return document;
  }

  /**
   * Staff equivalent of `getOwnedDocumentOrThrow` — Secure Access /
   * Role-based Permissions for the Document Management Center. Admins
   * may access any document; an employee only a document belonging to
   * a customer they're assigned a lead for (role is enforced at the
   * controller first via `@Auth`, this is the ownership layer on top).
   */
  async getDocumentForStaffOrThrow(documentId: string, staff: UserEntity): Promise<DocumentEntity> {
    const document = await this.documentRepository.findOneById(documentId);
    if (!document) {
      throw new NotFoundException('Document not found.');
    }
    if (staff.role === UserRole.EMPLOYEE) {
      const hasAccess = await this.loanApplicationsService.isEmployeeAssignedToCustomer(
        staff.id,
        document.ownerId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this document.');
      }
    }
    return document;
  }

  /** Download Audit — called once access to `document`'s bytes has actually been granted. */
  async logDownload(document: DocumentEntity, actor: UserEntity): Promise<void> {
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        actorId: actor.id,
        action: 'document_downloaded',
        entityName: 'documents',
        entityId: document.id,
        metadata: { ownerId: document.ownerId, originalFileName: document.originalFileName },
      }),
    );
  }

  /** Verification Status — staff-only, ownership-scoped the same way as `getDocumentForStaffOrThrow`. */
  async updateVerification(
    documentId: string,
    staff: UserEntity,
    dto: UpdateDocumentVerificationDto,
  ): Promise<DocumentResponseDto> {
    const document = await this.getDocumentForStaffOrThrow(documentId, staff);

    const updated = await this.documentRepository.update(documentId, {
      verificationStatus: dto.status,
      verificationNote: dto.note ?? null,
      verifiedById: staff.id,
      verifiedAt: new Date(),
    });
    if (!updated) {
      throw new NotFoundException('Document not found after update.');
    }

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        actorId: staff.id,
        action: 'document_verification_updated',
        entityName: 'documents',
        entityId: documentId,
        metadata: { status: dto.status, note: dto.note ?? null, ownerId: document.ownerId },
      }),
    );

    const withVerifier = await this.documentRepository.findOneWithVerifier(documentId);
    return DocumentResponseDto.fromEntity(withVerifier ?? updated);
  }

  /** Download Audit, surfaced — every download/verification event recorded for this document. */
  async getAuditForDocument(
    documentId: string,
    staff: UserEntity,
  ): Promise<DocumentAuditEntryDto[]> {
    await this.getDocumentForStaffOrThrow(documentId, staff);

    const entries = await this.auditLogRepository.find({
      where: { entityName: 'documents', entityId: documentId },
      order: { createdAt: 'DESC' },
      relations: ['actor'],
    });
    return entries.map((entry) => DocumentAuditEntryDto.fromEntity(entry));
  }
}
