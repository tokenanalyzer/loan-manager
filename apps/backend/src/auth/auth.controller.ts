import { Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { UserEntity } from '../database/entities';

import { AuthService } from './auth.service';
import { Auth } from './decorators/auth.decorator';
import { CurrentAppUser } from './decorators/current-app-user.decorator';
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
    return UserProfileResponseDto.fromEntity(user);
  }

  /** Returns the current user's profile for an already-synced session. */
  @Get('me')
  @Auth()
  getCurrentUser(@CurrentAppUser() user: UserEntity): UserProfileResponseDto {
    return UserProfileResponseDto.fromEntity(user);
  }
}
