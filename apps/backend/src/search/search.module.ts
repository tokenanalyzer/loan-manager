import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerProfileRepository } from '../customers/customer-profile.repository';
import {
  CustomerProfileEntity,
  DocumentEntity,
  LoanApplicationEntity,
  UserEntity,
} from '../database/entities';
import { DocumentRepository } from '../documents/document.repository';
import { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import { UserRepository } from '../users/user.repository';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

/**
 * SearchModule — every repository here is a duplicated, lightweight
 * provider (same class the owning module already uses), not a real
 * import of `LoanApplicationsModule`/`UsersModule`/`CustomersModule`/
 * `DocumentsModule`. Those modules already have real dependencies on
 * each other (`LoanApplicationsModule` ↔ `DocumentsModule` via
 * `forwardRef`, `LoanApplicationsModule`/`UsersModule` → `CustomersModule`)
 * — importing any of them here risks entangling that graph further.
 * TypeORM repositories are stateless wrappers around the shared
 * `DataSource`, so a second registration is exactly as correct as the
 * first; this is the same pattern `UsersModule` already uses for its
 * own copy of `LoanApplicationRepository`, and Phase 3/4 used for
 * `AuditLogEntity`/`LeadAssignmentEntity`/`DocumentRepository`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([LoanApplicationEntity, UserEntity, CustomerProfileEntity, DocumentEntity]),
  ],
  controllers: [SearchController],
  providers: [LoanApplicationRepository, UserRepository, CustomerProfileRepository, DocumentRepository, SearchService],
})
export class SearchModule {}
