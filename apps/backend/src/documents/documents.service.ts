import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DocumentEntity, DocumentType, UserEntity } from '../database/entities';
import { StorageService } from '../storage/storage.service';

import { DocumentTypeRepository } from './document-type.repository';
import { DocumentRepository } from './document.repository';
import { DocumentResponseDto } from './dto/document-response.dto';
import {
  DocumentCategoryGroupDto,
  DocumentsOverviewResponseDto,
  DocumentTypeOverviewDto,
} from './dto/documents-overview-response.dto';
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
  ) {}

  /**
   * Categories → types → upload slots, cross-referenced against the
   * customer's own documents. `categoryId` (a loan-application
   * category id, e.g. `home`) additionally includes `loan_specific`
   * types tagged for that category; omit it for the general
   * (non-application-scoped) Documents tab view.
   */
  async getOverview(
    user: UserEntity,
    categoryId?: string,
  ): Promise<DocumentsOverviewResponseDto> {
    const [types, documents] = await Promise.all([
      this.documentTypeRepository.findAllActive(),
      this.documentRepository.findAllByOwner(user.id),
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
}
