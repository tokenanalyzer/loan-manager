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
}
