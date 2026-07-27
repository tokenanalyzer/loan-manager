import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { DocumentEntity } from '../database/entities';

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
}
