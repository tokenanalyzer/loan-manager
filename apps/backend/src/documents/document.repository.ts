import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { DocumentEntity, DocumentType } from '../database/entities';

@Injectable()
export class DocumentRepository extends BaseRepository<DocumentEntity> {
  constructor(@InjectRepository(DocumentEntity) repository: Repository<DocumentEntity>) {
    super(repository);
  }

  async findAllByOwner(ownerId: string): Promise<DocumentEntity[]> {
    return this.repository.find({ where: { ownerId }, order: { uploadedAt: 'DESC' } });
  }

  async findByOwnerAndType(
    ownerId: string,
    documentType: DocumentType,
  ): Promise<DocumentEntity | null> {
    return this.repository.findOne({ where: { ownerId, documentType } });
  }
}
