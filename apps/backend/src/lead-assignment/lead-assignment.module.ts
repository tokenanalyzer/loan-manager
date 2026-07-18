import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LeadAssignmentEntity } from '../database/entities';
import { LoanApplicationsModule } from '../loan-applications/loan-applications.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

import { LeadAssignmentHistoryRepository } from './lead-assignment-history.repository';
import { LeadAssignmentController } from './lead-assignment.controller';
import { LeadAssignmentService } from './lead-assignment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeadAssignmentEntity]),
    LoanApplicationsModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [LeadAssignmentController],
  providers: [LeadAssignmentHistoryRepository, LeadAssignmentService],
})
export class LeadAssignmentModule {}
