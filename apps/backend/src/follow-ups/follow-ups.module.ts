import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FollowUpEntity, LoanApplicationEntity } from '../database/entities';
import { LoanApplicationRepository } from '../loan-applications/loan-application.repository';

import { FollowUpRepository } from './follow-up.repository';
import { FollowUpsController } from './follow-ups.controller';
import { FollowUpsService } from './follow-ups.service';

@Module({
  imports: [TypeOrmModule.forFeature([FollowUpEntity, LoanApplicationEntity])],
  controllers: [FollowUpsController],
  providers: [
    FollowUpRepository,
    // Duplicated lightweight provider, not a module import of
    // LoanApplicationsModule — same "avoid a module cycle" pattern
    // CustomersModule already uses; this module only needs a single
    // ownership-check read, not the full service.
    LoanApplicationRepository,
    FollowUpsService,
  ],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}
