import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { DocumentVersionEntity } from '../database/entities';

@Injectable()
export class DocumentVersionRepository extends BaseRepository<DocumentVersionEntity> {
  constructor(@InjectRepository(DocumentVersionEntity) repository: Repository<DocumentVersionEntity>) {
    super(repository);
  }

  /** Newest first — the natural order for a Version History view (still deferred). */
  async findAllByDocument(documentId: string): Promise<DocumentVersionEntity[]> {
    return this.repository.find({
      where: { documentId },
      order: { versionNumber: 'DESC' },
      relations: ['uploadedBy', 'verifiedBy'],
    });
  }
}
