import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogEntity, EmployeeBreakEntity, EmployeeProfileEntity } from '../database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

import { EmployeeBreakRepository } from './employee-break.repository';
import { EmployeeProfileRepository } from './employee-profile.repository';
import { WorkStatusController } from './work-status.controller';
import { WorkStatusService } from './work-status.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmployeeProfileEntity, EmployeeBreakEntity, AuditLogEntity]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [WorkStatusController],
  providers: [EmployeeProfileRepository, EmployeeBreakRepository, WorkStatusService],
})
export class WorkStatusModule {}
