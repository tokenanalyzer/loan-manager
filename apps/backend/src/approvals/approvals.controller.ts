import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';

import { Auth, AuthPermission } from '../auth/decorators/auth.decorator';
import { CurrentAppUser } from '../auth/decorators/current-app-user.decorator';
import { Permission } from '../auth/permissions';
import { UserEntity } from '../database/entities';

import { ApprovalsService } from './approvals.service';
import { ApprovalDecisionDto } from './dto/approval-decision.dto';
import {
  ApprovalRequestResponseDto,
  PaginatedApprovalRequestResponseDto,
} from './dto/approval-request-response.dto';
import { ListApprovalsQueryDto } from './dto/list-approvals-query.dto';

/**
 * ApprovalsController — the maker-checker queue (Admin Authentication
 * Module, Phase 5). Deliberately generic across whichever domain
 * actions are currently gated (today: staff Disable/Archive/Restore)
 * — see `ApprovalsService`'s doc comment.
 */
@Controller({ path: 'approvals', version: '1' })
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  /** The checker's queue — Super Admin only. */
  @Get()
  @AuthPermission(Permission.APPROVAL_READ)
  async list(@Query() query: ListApprovalsQueryDto): Promise<PaginatedApprovalRequestResponseDto> {
    return this.approvalsService.listQueue(query);
  }

  /** A maker's own submitted requests, any status. */
  @Get('mine')
  @Auth()
  async mine(@CurrentAppUser() actor: UserEntity): Promise<ApprovalRequestResponseDto[]> {
    return this.approvalsService.listMine(actor.id);
  }

  @Post(':id/decision')
  @AuthPermission(Permission.APPROVAL_DECIDE)
  async decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDecisionDto,
    @CurrentAppUser() actor: UserEntity,
  ): Promise<{ request: ApprovalRequestResponseDto; result?: unknown }> {
    return this.approvalsService.decide(id, actor, dto);
  }

  @Patch(':id/withdraw')
  @Auth()
  async withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAppUser() actor: UserEntity,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalsService.withdraw(id, actor);
  }
}
