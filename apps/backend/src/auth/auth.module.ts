import { Global, Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
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
 */
@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, FirebaseAuthGuard, SyncUserGuard, RolesGuard],
  exports: [AuthService, FirebaseAuthGuard, SyncUserGuard, RolesGuard],
})
export class AuthModule {}
