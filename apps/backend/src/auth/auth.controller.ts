import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { UserEntity, UserRole } from '../database/entities';

import { AuthService } from './auth.service';
import { Auth } from './decorators/auth.decorator';
import { CurrentAppUser } from './decorators/current-app-user.decorator';
import { UpdateDeviceTokenDto } from './dto/update-device-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';

/**
 * AuthController — the minimum API surface needed to make Firebase
 * login work end-to-end.
 *
 * Phase 4 scope: exactly two endpoints, both auth-related. `@Auth()`
 * (no roles) means "any authenticated user" — it verifies the token,
 * syncs/attaches the UserEntity, and (via SyncUserGuard) is exactly
 * what makes `@CurrentAppUser()` available here.
 *
 * Phase 7: a tighter rate limit than the global default on `/session`
 * — it's called on every sign-in and does a DB read-or-write, making
 * it a more attractive target for abuse than a plain read endpoint.
 */
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Called by each client right after a successful Firebase sign-in.
   * `@Auth()`'s SyncUserGuard does the find-or-create; this handler
   * additionally stamps the Phase 3 login-metadata fields (this is the
   * one endpoint that represents an actual fresh login, as opposed to
   * every other authenticated request) and returns the result.
   */
  @Post('session')
  @HttpCode(HttpStatus.OK)
  @Auth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async createSession(
    @CurrentAppUser() user: UserEntity,
    @Req() request: Request,
  ): Promise<UserProfileResponseDto> {
    const userAgent = request.headers['user-agent'];
    await this.authService.recordSuccessfulLogin(
      user,
      request.ip ?? null,
      typeof userAgent === 'string' ? userAgent : null,
    );
    return this.buildProfileResponse(user);
  }

  /** Returns the current user's profile for an already-synced session. */
  @Get('me')
  @Auth()
  async getCurrentUser(@CurrentAppUser() user: UserEntity): Promise<UserProfileResponseDto> {
    return this.buildProfileResponse(user);
  }

  /**
   * Shared by `session`/`me`: an EMPLOYEE caller's `employeeProfile`
   * fields (Settings → Profile, sub-phase 5) are looked up once here
   * rather than duplicated at each call site — `null` for every other
   * role by construction, since the lookup is only ever attempted for
   * `UserRole.EMPLOYEE`.
   */
  private async buildProfileResponse(user: UserEntity): Promise<UserProfileResponseDto> {
    const employeeProfile =
      user.role === UserRole.EMPLOYEE ? await this.authService.findEmployeeProfile(user.id) : null;
    return UserProfileResponseDto.fromEntity(user, employeeProfile);
  }

  /** Settings → Profile: self-service edit of full name / phone. See `AuthService.updateProfile`. */
  @Patch('me')
  @Auth()
  async updateProfile(
    @CurrentAppUser() user: UserEntity,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileResponseDto> {
    const updated = await this.authService.updateProfile(user, dto);
    return UserProfileResponseDto.fromEntity(updated);
  }

  /** Push Notifications: registers/refreshes the caller's FCM device token. See `AuthService.updateDeviceToken`. */
  @Post('me/device-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth()
  async updateDeviceToken(
    @CurrentAppUser() user: UserEntity,
    @Body() dto: UpdateDeviceTokenDto,
  ): Promise<void> {
    await this.authService.updateDeviceToken(user, dto.token);
  }
}
