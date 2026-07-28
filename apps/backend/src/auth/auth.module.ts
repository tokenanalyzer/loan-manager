import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmployeeProfileEntity } from '../database/entities';
import { UsersModule } from '../users/users.module';
import { EmployeeProfileRepository } from '../work-status/employee-profile.repository';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { SyncUserGuard } from './guards/sync-user.guard';

/**
 * AuthModule — Firebase Authentication support.
 *
 * @Global() so every feature module can use `@Auth(...)` (which
 * references FirebaseAuthGuard/SyncUserGuard/RolesGuard by class)
 * without each one having to import AuthModule explicitly — mirrors
 * the same pattern already used by FirebaseAdminModule.
 *
 * No OTP-sending logic lives here — Firebase's client SDKs handle
 * that directly; this backend only verifies the resulting ID token.
 *
 * Employee CRM (sub-phase 5): `EmployeeProfileRepository` is
 * provided again here as a duplicated lightweight repository — the
 * same pattern `CustomersModule`/`FollowUpsModule`/
 * `EmployeeDashboardModule` already use to read another module's
 * entity without importing the owning module (`WorkStatusModule`
 * would pull in `NotificationsModule`, and AuthModule is `@Global()`
 * and loaded very early — not a dependency worth taking for one
 * read-only lookup).
 */
@Global()
@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([EmployeeProfileEntity])],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmployeeProfileRepository,
    FirebaseAuthGuard,
    SyncUserGuard,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [AuthService, FirebaseAuthGuard, SyncUserGuard, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
