/**
 * Barrel export of all entities + the naming strategy used both by
 * the Nest-managed connection (`database.module.ts`) and the
 * standalone CLI DataSource (`data-source.ts`), so both stay in sync.
 */
export * from './abstract.entity';
export * from './audit-log.entity';
export * from './customer-profile.entity';
export * from './document.entity';
export * from './employee-profile.entity';
export * from './enums';
export * from './loan-application.entity';
export * from './loan.entity';
export * from './notification.entity';
export * from './payment.entity';
export * from './user.entity';

import { AuditLogEntity } from './audit-log.entity';
import { CustomerProfileEntity } from './customer-profile.entity';
import { DocumentEntity } from './document.entity';
import { EmployeeProfileEntity } from './employee-profile.entity';
import { LoanApplicationEntity } from './loan-application.entity';
import { LoanEntity } from './loan.entity';
import { NotificationEntity } from './notification.entity';
import { PaymentEntity } from './payment.entity';
import { UserEntity } from './user.entity';

export const ALL_ENTITIES = [
  UserEntity,
  CustomerProfileEntity,
  EmployeeProfileEntity,
  LoanApplicationEntity,
  LoanEntity,
  PaymentEntity,
  DocumentEntity,
  AuditLogEntity,
  NotificationEntity,
];
