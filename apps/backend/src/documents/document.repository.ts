import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { DocumentCategory, DocumentEntity } from '../database/entities';

/** Safety cap on the Enterprise Document Center's unpaginated listing — well above real data volumes today, just a defensive ceiling. */
const DOCUMENT_CENTER_LIMIT = 500;

@Injectable()
export class DocumentRepository extends BaseRepository<DocumentEntity> {
  constructor(@InjectRepository(DocumentEntity) repository: Repository<DocumentEntity>) {
    super(repository);
  }

  async findAllByOwner(ownerId: string): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { ownerId },
      order: { uploadedAt: 'DESC' },
      relations: ['verifiedBy'],
    });
  }

  /** Customer 360's Documents section — adds the catalog type (for category/label) and the current version's uploader, on top of `findAllByOwner`. */
  async findAllByOwnerWithDetails(ownerId: string): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { ownerId },
      order: { uploadedAt: 'DESC' },
      relations: ['verifiedBy', 'documentTypeRef', 'currentVersion', 'currentVersion.uploadedBy'],
    });
  }

  async findOneWithVerifier(id: string): Promise<DocumentEntity | null> {
    return this.repository.findOne({ where: { id }, relations: ['verifiedBy'] });
  }

  async findByOwnerTypeAndSlot(
    ownerId: string,
    documentTypeCode: string,
    slotIndex: number,
  ): Promise<DocumentEntity | null> {
    return this.repository.findOne({ where: { ownerId, documentTypeCode, slotIndex } });
  }

  async countByOwnerAndType(ownerId: string, documentTypeCode: string): Promise<number> {
    return this.repository.count({ where: { ownerId, documentTypeCode } });
  }

  /** Ownership is enforced by the caller before this runs. */
  async deleteById(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /** Global Search's Documents group — file name or catalog type label. `allowedOwnerIds`, when given, scopes results to an employee's assigned customers' documents. */
  async search(query: string, limit: number, allowedOwnerIds?: string[]): Promise<DocumentEntity[]> {
    if (allowedOwnerIds && allowedOwnerIds.length === 0) return [];

    const lower = `%${query.toLowerCase()}%`;
    const qb = this.repository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.documentTypeRef', 'documentTypeRef')
      .leftJoinAndSelect('document.owner', 'owner')
      .where(
        '(LOWER(document.original_file_name) LIKE :lower OR LOWER(documentTypeRef.label) LIKE :lower)',
        { lower },
      );

    if (allowedOwnerIds) {
      qb.andWhere('document.owner_id IN (:...allowedOwnerIds)', { allowedOwnerIds });
    }

    // Entity property name, not raw column — see the identical note on
    // `LoanApplicationRepository.search`'s own `.orderBy()`.
    return qb.orderBy('document.uploadedAt', 'DESC').take(limit).getMany();
  }

  /**
   * The Enterprise Document Center's platform-wide listing — every
   * document, not one customer's (generalizes `findAllByOwnerWithDetails`
   * to many/all owners), with the same category/type/owner relations
   * List/Grid/Folder views and the row actions all need. `allowedOwnerIds`
   * scopes to an employee's assigned customers; omitted for Admin.
   */
  async findAllWithDetails(filters: {
    allowedOwnerIds?: string[];
    category?: DocumentCategory;
    verificationStatus?: 'pending' | 'verified' | 'rejected' | 'reupload_requested';
    search?: string;
  }): Promise<DocumentEntity[]> {
    if (filters.allowedOwnerIds && filters.allowedOwnerIds.length === 0) return [];

    const qb = this.repository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.documentTypeRef', 'documentTypeRef')
      .leftJoinAndSelect('document.owner', 'owner')
      .leftJoinAndSelect('document.verifiedBy', 'verifiedBy')
      .leftJoinAndSelect('document.currentVersion', 'currentVersion')
      .leftJoinAndSelect('currentVersion.uploadedBy', 'uploadedBy');

    if (filters.allowedOwnerIds) {
      qb.andWhere('document.owner_id IN (:...allowedOwnerIds)', { allowedOwnerIds: filters.allowedOwnerIds });
    }
    if (filters.category) {
      qb.andWhere('documentTypeRef.category = :category', { category: filters.category });
    }
    if (filters.verificationStatus) {
      qb.andWhere('document.verification_status = :verificationStatus', {
        verificationStatus: filters.verificationStatus,
      });
    }
    if (filters.search?.trim()) {
      const lower = `%${filters.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(document.original_file_name) LIKE :lower OR LOWER(documentTypeRef.label) LIKE :lower OR LOWER(owner.full_name) LIKE :lower)',
        { lower },
      );
    }

    return qb.orderBy('document.uploadedAt', 'DESC').take(DOCUMENT_CENTER_LIMIT).getMany();
  }
}
