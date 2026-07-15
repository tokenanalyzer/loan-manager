import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { DocumentTypeEntity } from '../database/entities';

import { DocumentTypeRepository } from './document-type.repository';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';

/**
 * DocumentTypesService — catalog management. This is the whole point
 * of Phase 2's architecture: a future Admin Panel calls these three
 * methods (via `DocumentTypesController`) to add a document type,
 * retire one, or adjust its required/slot-count/loan-category rules
 * — no backend code change, no migration, no Flutter release.
 * `DocumentsService` (the customer-facing flow) only ever reads what
 * this writes.
 */
@Injectable()
export class DocumentTypesService {
  constructor(private readonly documentTypeRepository: DocumentTypeRepository) {}

  /** Admin listing — every type, active or not. */
  async findAll(): Promise<DocumentTypeEntity[]> {
    return this.documentTypeRepository.findAllIncludingInactive();
  }

  async create(dto: CreateDocumentTypeDto): Promise<DocumentTypeEntity> {
    const existing = await this.documentTypeRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(`A document type with code "${dto.code}" already exists.`);
    }

    return this.documentTypeRepository.create({
      code: dto.code,
      label: dto.label,
      category: dto.category,
      isRequired: dto.isRequired ?? false,
      maxUploads: dto.maxUploads ?? 1,
      applicableLoanCategoryIds: dto.applicableLoanCategoryIds ?? null,
      sortOrder: dto.sortOrder ?? 0,
    });
  }

  async update(code: string, dto: UpdateDocumentTypeDto): Promise<DocumentTypeEntity> {
    const existing = await this.documentTypeRepository.findByCode(code);
    if (!existing) {
      throw new NotFoundException(`No document type with code "${code}".`);
    }

    const updated = await this.documentTypeRepository.updateByCode(code, {
      label: dto.label,
      category: dto.category,
      isRequired: dto.isRequired,
      maxUploads: dto.maxUploads,
      applicableLoanCategoryIds: dto.applicableLoanCategoryIds,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    });
    if (!updated) {
      throw new NotFoundException(`No document type with code "${code}".`);
    }
    return updated;
  }
}
