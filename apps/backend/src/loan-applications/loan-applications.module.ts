import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomersModule } from '../customers/customers.module';
import { LoanApplicationEntity, LoanEntity } from '../database/entities';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { LoanApplicationRepository } from './loan-application.repository';
import { LoanApplicationsController } from './loan-applications.controller';
import { LoanApplicationsService } from './loan-applications.service';
import { LoanJourneyDetectionService } from './loan-journey-detection.service';
import { LoanRepository } from './loan.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanApplicationEntity, LoanEntity]),
    NotificationsModule,
    CustomersModule,
    // See DocumentsModule's own forwardRef(() => LoanApplicationsModule) comment.
    forwardRef(() => DocumentsModule),
  ],
  controllers: [LoanApplicationsController],
  providers: [
    LoanApplicationRepository,
    LoanRepository,
    LoanApplicationsService,
    LoanJourneyDetectionService,
  ],
  exports: [LoanApplicationsService, LoanApplicationRepository],
})
export class LoanApplicationsModule {}
