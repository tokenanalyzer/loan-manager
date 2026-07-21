import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';

import { BaseRepository } from '../common/repository/base.repository';
import { DocumentTypeEntity } from '../database/entities';

/**
 * Note: `DocumentTypeEntity`'s primary key is `code` (a varchar), not
 * the `id` uuid `BaseRepository.update`/`findOneById` assume — this
 * repository adds its own `code`-keyed lookups/update instead of
 * relying on those two inherited methods.
 */
@Injectable()
export class DocumentTypeRepository extends BaseRepository<DocumentTypeEntity> {
  constructor(
    @InjectRepository(DocumentTypeEntity)
    private readonly typeRepository: Repository<DocumentTypeEntity>,
  ) {
    super(typeRepository);
  }

  async updateByCode(
    code: string,
    data: DeepPartial<DocumentTypeEntity>,
  ): Promise<DocumentTypeEntity | null> {
    await this.typeRepository.update(code, data as never);
    return this.findByCode(code);
  }

  /** The customer-facing catalog — active types only, catalog display order. */
  async findAllActive(): Promise<DocumentTypeEntity[]> {
    return this.repository.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
  }

  /** Admin management view — every type, active or not. */
  async findAllIncludingInactive(): Promise<DocumentTypeEntity[]> {
    return this.repository.find({ order: { sortOrder: 'ASC' } });
  }

  async findByCode(code: string): Promise<DocumentTypeEntity | null> {
    return this.repository.findOneBy({ code });
  }
}
