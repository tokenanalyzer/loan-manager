import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentEntity, DocumentTypeEntity } from '../database/entities';

import { DocumentTypeRepository } from './document-type.repository';
import { DocumentTypesController } from './document-types.controller';
import { DocumentTypesService } from './document-types.service';
import { DocumentRepository } from './document.repository';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, DocumentTypeEntity])],
  controllers: [DocumentsController, DocumentTypesController],
  providers: [
    DocumentRepository,
    DocumentTypeRepository,
    DocumentsService,
    DocumentTypesService,
  ],
  exports: [DocumentsService, DocumentTypesService],
})
export class DocumentsModule {}
