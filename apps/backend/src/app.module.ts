import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { CustomersModule } from './customers/customers.module';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { FirebaseAdminModule } from './firebase/firebase-admin.module';
import { LeadAssignmentModule } from './lead-assignment/lead-assignment.module';
import { LoanApplicationsModule } from './loan-applications/loan-applications.module';
import { LoggerModule } from './logger/logger.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StorageModule } from './storage/storage.module';
import { WorkStatusModule } from './work-status/work-status.module';

/**
 * Root application module.
 *
 * Phase 7 adds global rate limiting (ThrottlerModule + a global
 * ThrottlerGuard) — a production/security hardening gap identified by
 * audit: this API previously had no request-rate protection anywhere,
 * a real risk for a public-facing fintech API (brute-force against
 * auth, storage exhaustion via repeated document uploads, etc.).
 * Defaults are deliberately generous (60 req/min) since this guards
 * every route globally; tighter, endpoint-specific limits can be
 * layered on with `@Throttle()` where a specific route needs it.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    LoggerModule,
    DatabaseModule,
    FirebaseAdminModule,
    StorageModule,
    AuthModule,
    CustomersModule,
    NotificationsModule,
    LoanApplicationsModule,
    DocumentsModule,
    LeadAssignmentModule,
    WorkStatusModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
