import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';

import { Auth, AuthPermission } from '../auth/decorators/auth.decorator';
import { CurrentAppUser } from '../auth/decorators/current-app-user.decorator';
import { Permission } from '../auth/permissions';
import { UserEntity, UserRole } from '../database/entities';

import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import { StaffLifecycleOutcome } from './dto/staff-lifecycle-outcome.dto';
import { StaffLifecycleReasonDto } from './dto/staff-lifecycle-reason.dto';
import { CreateStaffUserResponseDto, PaginatedStaffUserResponseDto } from './dto/staff-user-response.dto';
import { UsersService } from './users.service';

/**
 * UsersController — staff account provisioning, Admin-only.
 *
 * The only way an employee/admin account comes into existence — see
 * `AuthService`'s doc comment on why a Firebase sign-in alone can
 * never create one. Replaces the previous "insert a row directly
 * against the database" process.
 *
 * Create/list stay `@Auth(ADMIN)` (deliberately not migrated to
 * `@AuthPermission` this phase — see `IMPLEMENTATION_PROGRESS.md`).
 * The Phase 3 lifecycle endpoints below are new, so they use
 * `@AuthPermission` from the start — that's the entire reason
 * `STAFF_DISABLE`/`STAFF_ARCHIVE`/`STAFF_RESTORE` exist.
 */
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Auth(UserRole.ADMIN)
  async create(
    @Body() dto: CreateStaffUserDto,
    @CurrentAppUser() actor: UserEntity,
  ): Promise<CreateStaffUserResponseDto> {
    const { user, inviteLink } = await this.usersService.createStaffUser(dto, actor);
    return CreateStaffUserResponseDto.fromCreated(user, inviteLink);
  }

  @Get()
  @Auth(UserRole.ADMIN)
  async findAll(@Query() query: ListStaffQueryDto): Promise<PaginatedStaffUserResponseDto> {
    return this.usersService.listStaff(query);
  }

  /**
   * Phase 5: an `ORG_ADMIN` actor is routed into the maker-checker
   * workflow — see `MakerCheckerPolicyService`. The response shape is a
   * discriminated union (`StaffLifecycleOutcome`); the Admin Panel
   * branches on `outcome` rather than assuming the target's status
   * always changed immediately.
   */
  @Patch(':id/disable')
  @AuthPermission(Permission.STAFF_DISABLE)
  async disable(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StaffLifecycleReasonDto,
    @CurrentAppUser() actor: UserEntity,
  ): Promise<StaffLifecycleOutcome> {
    return this.usersService.disableStaffUser(id, dto.reason, actor);
  }

  @Patch(':id/archive')
  @AuthPermission(Permission.STAFF_ARCHIVE)
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StaffLifecycleReasonDto,
    @CurrentAppUser() actor: UserEntity,
  ): Promise<StaffLifecycleOutcome> {
    return this.usersService.archiveStaffUser(id, dto.reason, actor);
  }

  @Patch(':id/restore')
  @AuthPermission(Permission.STAFF_RESTORE)
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() actor: UserEntity,
  ): Promise<StaffLifecycleOutcome> {
    return this.usersService.restoreStaffUser(id, actor);
  }

  /**
   * "Resend Invite" (never signed in) and "Password Reset" (has) are
   * the same backend action — see `UsersService.resendInviteOrResetPassword`.
   * The Admin Panel picks the label; this endpoint doesn't need to know
   * which one the caller means.
   */
  @Post(':id/reset-password')
  @AuthPermission(Permission.STAFF_RESET_PASSWORD)
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() actor: UserEntity,
  ): Promise<CreateStaffUserResponseDto> {
    const { user, inviteLink } = await this.usersService.resendInviteOrResetPassword(id, actor);
    return CreateStaffUserResponseDto.fromCreated(user, inviteLink);
  }
}
