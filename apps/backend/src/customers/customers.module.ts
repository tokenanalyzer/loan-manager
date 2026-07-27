import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AuditLogEntity,
  CustomerProfileEntity,
  DocumentEntity,
  DocumentVersionEntity,
  LeadAssignmentEntity,
  LoanApplicationEntity,
} from '../database/entities';
import { DocumentVersionRepository } from '../documents/document-version.repository';
import { DocumentRepository } from '../documents/document.repository';
import { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

import { CustomerDocumentExportService } from './customer-document-export.service';
import { CustomerOverviewService } from './customer-overview.service';
import { CustomerProfileRepository } from './customer-profile.repository';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerProfileEntity,
      AuditLogEntity,
      LeadAssignmentEntity,
      LoanApplicationEntity,
      DocumentEntity,
      DocumentVersionEntity,
    ]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [CustomersController],
  providers: [
    CustomerProfileRepository,
    CustomersService,
    // Duplicated lightweight repository providers, not a module import of
    // LoanApplicationsModule/DocumentsModule — both of those already
    // depend on CustomersModule (LoanJourneyDetectionService needs
    // CustomersService), so importing either back here would be a module
    // cycle. These repositories are stateless TypeORM wrappers; a second
    // instance is exactly as correct as the first. See
    // CustomerOverviewService's doc comment.
    LoanApplicationRepository,
    DocumentRepository,
    DocumentVersionRepository,
    CustomerOverviewService,
    CustomerDocumentExportService,
  ],
  exports: [CustomersService],
})
export class CustomersModule {}
