import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogEntity, DocumentEntity, DocumentTypeEntity } from '../database/entities';
import { LoanApplicationsModule } from '../loan-applications/loan-applications.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { DocumentTypeRepository } from './document-type.repository';
import { DocumentTypesController } from './document-types.controller';
import { DocumentTypesService } from './document-types.service';
import { DocumentRepository } from './document.repository';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity, DocumentTypeEntity, AuditLogEntity]),
    // Mutual dependency: Documents needs LoanApplications (resolveQueriesForCustomer,
    // setWaitingForCustomer) and LoanApplications needs Documents (the approval
    // validation gate, getBlockingDocumentsForApproval) — forwardRef() on both
    // sides is NestJS's standard resolution for genuine two-way module deps.
    forwardRef(() => LoanApplicationsModule),
    NotificationsModule,
  ],
  controllers: [DocumentsController, DocumentTypesController],
  providers: [DocumentRepository, DocumentTypeRepository, DocumentsService, DocumentTypesService],
  exports: [DocumentsService, DocumentTypesService],
})
export class DocumentsModule {}
