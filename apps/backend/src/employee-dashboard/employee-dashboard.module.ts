import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FollowUpEntity, LoanApplicationEntity } from '../database/entities';
import { FollowUpRepository } from '../follow-ups/follow-up.repository';
import { LoanApplicationRepository } from '../loan-applications/loan-application.repository';
import { WorkStatusModule } from '../work-status/work-status.module';

import { EmployeeDashboardController } from './employee-dashboard.controller';
import { EmployeeDashboardService } from './employee-dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([LoanApplicationEntity, FollowUpEntity]), WorkStatusModule],
  controllers: [EmployeeDashboardController],
  providers: [
    // Duplicated lightweight repository providers — see
    // EmployeeDashboardService's own doc comment on this pattern.
    LoanApplicationRepository,
    FollowUpRepository,
    EmployeeDashboardService,
  ],
})
export class EmployeeDashboardModule {}
