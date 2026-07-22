/**
 * Barrel export of all entities + the naming strategy used both by
 * the Nest-managed connection (`database.module.ts`) and the
 * standalone CLI DataSource (`data-source.ts`), so both stay in sync.
 */
export * from './abstract.entity';
export * from './audit-log.entity';
export * from './customer-profile.entity';
export * from './document.entity';
export * from './document-type.entity';
export * from './employee-break.entity';
export * from './employee-profile.entity';
export * from './enums';
export * from './lead-assignment.entity';
export * from './loan-application.entity';
export * from './loan.entity';
export * from './notification.entity';
export * from './payment.entity';
export * from './reward-config.entity';
export * from './reward.entity';
export * from './user.entity';

import { AuditLogEntity } from './audit-log.entity';
import { CustomerProfileEntity } from './customer-profile.entity';
import { DocumentTypeEntity } from './document-type.entity';
import { DocumentEntity } from './document.entity';
import { EmployeeBreakEntity } from './employee-break.entity';
import { EmployeeProfileEntity } from './employee-profile.entity';
import { LeadAssignmentEntity } from './lead-assignment.entity';
import { LoanApplicationEntity } from './loan-application.entity';
import { LoanEntity } from './loan.entity';
import { NotificationEntity } from './notification.entity';
import { PaymentEntity } from './payment.entity';
import { RewardConfigEntity } from './reward-config.entity';
import { RewardEntity } from './reward.entity';
import { UserEntity } from './user.entity';

export const ALL_ENTITIES = [
  UserEntity,
  CustomerProfileEntity,
  EmployeeProfileEntity,
  LoanApplicationEntity,
  LoanEntity,
  PaymentEntity,
  DocumentEntity,
  DocumentTypeEntity,
  AuditLogEntity,
  NotificationEntity,
  LeadAssignmentEntity,
  EmployeeBreakEntity,
  RewardConfigEntity,
  RewardEntity,
];
