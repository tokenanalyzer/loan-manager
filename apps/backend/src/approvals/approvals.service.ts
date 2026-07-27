import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountStatus, ApprovalRequestEntity, ApprovalRequestStatus, AuditLogEntity, UserEntity, UserRole } from '../database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRepository } from '../users/user.repository';

import { ApprovalActionExecutorRegistry } from './approval-action-executor.interface';
import { ApprovalRequestRepository } from './approval-request.repository';
import { ApprovalDecisionDto } from './dto/approval-decision.dto';
import {
  ApprovalRequestResponseDto,
  PaginatedApprovalRequestResponseDto,
} from './dto/approval-request-response.dto';
import { ListApprovalsQueryDto } from './dto/list-approvals-query.dto';

/**
 * ApprovalsService — the maker-checker workflow engine (Admin
 * Authentication Module, Phase 5). Deliberately generic: it never
 * branches on what `action` a request is for — approval/rejection
 * mechanics, notifications, and audit trail are the same regardless of
 * which domain module registered the executor (see
 * `ApprovalActionExecutorRegistry`).
 */
@Injectable()
export class ApprovalsService {
  constructor(
    private readonly approvalRequestRepository: ApprovalRequestRepository,
    private readonly userRepository: UserRepository,
    private readonly executorRegistry: ApprovalActionExecutorRegistry,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  /**
   * Called by a domain service (e.g. `UsersService`) once it has
   * already run its own fail-fast preflight checks — this method
   * itself only enforces the one rule that's actually about the
   * *request*, not the underlying action: no second pending request
   * for the same (target, action) pair. The partial unique index on
   * `approval_requests` is the concurrency backstop for this same rule.
   */
  async createRequest(params: {
    action: string;
    targetUserId: string;
    maker: UserEntity;
    payload: Record<string, unknown>;
  }): Promise<ApprovalRequestResponseDto> {
    const existing = await this.approvalRequestRepository.findPending(params.targetUserId, params.action);
    if (existing) {
      throw new ConflictException(
        `A ${params.action.replace(/_/g, ' ')} request for this account is already pending approval.`,
      );
    }

    const request = await this.approvalRequestRepository.create({
      action: params.action,
      targetUserId: params.targetUserId,
      makerId: params.maker.id,
      payload: params.payload,
      status: ApprovalRequestStatus.PENDING,
    });

    await this.writeAudit(`${params.action}_requested`, params.targetUserId, params.maker.id, {
      approvalRequestId: request.id,
      ...params.payload,
    });

    await this.notifyActiveSuperAdmins(request, params.maker);

    return this.toResponseDto(request);
  }

  /**
   * `checker` approves or rejects. Approving always re-runs the
   * registered executor — which re-validates every precondition from
   * scratch — rather than trusting anything about the world hasn't
   * changed since the request was created. A precondition that has
   * drifted (target no longer in the expected state, newly the last
   * active Super Admin, etc.) surfaces as a normal exception here,
   * caught and recorded as `FAILED` with `failureReason` — never left
   * silently `PENDING`, and never confused with a `REJECTED` (a human
   * decision) after the fact.
   *
   * `maker`, not `checker`, is threaded through as the acting user for
   * the executor — a disable/archive/restore is conceptually the
   * maker's action, merely gated on a second signature. The checker's
   * identity lives on this request row and in its own audit rows.
   */
  async decide(
    requestId: string,
    checker: UserEntity,
    dto: ApprovalDecisionDto,
  ): Promise<{ request: ApprovalRequestResponseDto; result?: unknown }> {
    const request = await this.approvalRequestRepository.findOneWithRelations(requestId);
    if (!request) {
      throw new NotFoundException('Approval request not found.');
    }
    if (request.status !== ApprovalRequestStatus.PENDING) {
      throw new ConflictException('This request has already been decided.');
    }
    if (request.makerId === checker.id) {
      // Unreachable under today's policy (only ADMIN holds APPROVAL_DECIDE,
      // and ADMIN can't currently be a maker) — kept as the safety net for
      // the day MakerCheckerPolicyService is extended to gate ADMIN too.
      throw new ForbiddenException('You cannot decide on your own request.');
    }

    if (dto.decision === 'reject') {
      const updated = await this.approvalRequestRepository.update(requestId, {
        status: ApprovalRequestStatus.REJECTED,
        checkerId: checker.id,
        decisionNote: dto.decisionNote,
        decidedAt: new Date(),
      });
      await this.writeAudit(`${request.action}_rejected`, request.targetUserId ?? null, checker.id, {
        approvalRequestId: request.id,
        decisionNote: dto.decisionNote,
      });
      await this.notifyMaker(request, 'rejected', dto.decisionNote);
      return { request: await this.toResponseDto(updated ?? request) };
    }

    const maker = request.makerId ? await this.userRepository.findOneById(request.makerId) : null;
    if (!maker || !request.targetUserId) {
      throw new NotFoundException('The original requester or target account no longer exists.');
    }

    let result: unknown;
    try {
      result = await this.executorRegistry.get(request.action).execute(request.targetUserId, request.payload ?? {}, maker);
    } catch (error) {
      await this.approvalRequestRepository.update(requestId, {
        status: ApprovalRequestStatus.FAILED,
        checkerId: checker.id,
        decisionNote: dto.decisionNote,
        decidedAt: new Date(),
        failureReason: error instanceof Error ? error.message : 'Execution failed.',
      });
      await this.writeAudit(`${request.action}_approval_failed`, request.targetUserId, checker.id, {
        approvalRequestId: request.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    const updated = await this.approvalRequestRepository.update(requestId, {
      status: ApprovalRequestStatus.APPROVED,
      checkerId: checker.id,
      decisionNote: dto.decisionNote,
      decidedAt: new Date(),
    });
    await this.writeAudit(`${request.action}_approved`, request.targetUserId, checker.id, {
      approvalRequestId: request.id,
      decisionNote: dto.decisionNote,
    });
    await this.notifyMaker(request, 'approved');

    return { request: await this.toResponseDto(updated ?? request), result };
  }

  /** Only the original maker, only while nothing has happened yet. */
  async withdraw(requestId: string, actor: UserEntity): Promise<ApprovalRequestResponseDto> {
    const request = await this.approvalRequestRepository.findOneById(requestId);
    if (!request) {
      throw new NotFoundException('Approval request not found.');
    }
    if (request.makerId !== actor.id) {
      throw new ForbiddenException('You can only withdraw your own requests.');
    }
    if (request.status !== ApprovalRequestStatus.PENDING) {
      throw new ConflictException('This request has already been decided.');
    }

    const updated = await this.approvalRequestRepository.update(requestId, {
      status: ApprovalRequestStatus.WITHDRAWN,
      decidedAt: new Date(),
    });
    await this.writeAudit(`${request.action}_withdrawn`, request.targetUserId ?? null, actor.id, {
      approvalRequestId: request.id,
    });

    return this.toResponseDto(updated ?? request);
  }

  async listQueue(query: ListApprovalsQueryDto): Promise<PaginatedApprovalRequestResponseDto> {
    const { items, total } = await this.approvalRequestRepository.findQueue({
      status: query.status,
      action: query.action,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      items: items.map((item) => ApprovalRequestResponseDto.fromEntity(item)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async listMine(makerId: string): Promise<ApprovalRequestResponseDto[]> {
    const items = await this.approvalRequestRepository.findByMaker(makerId);
    return items.map((item) => ApprovalRequestResponseDto.fromEntity(item));
  }

  /** Powers the Team screen's "pending approval" badge — one indexed query per page load, not folded into `findStaffPaginated`'s query builder. */
  async findPendingByTargetIds(
    targetUserIds: string[],
  ): Promise<Map<string, { id: string; action: string; requestedAt: Date }>> {
    const pending = await this.approvalRequestRepository.findPendingByTargetIds(targetUserIds);
    const map = new Map<string, { id: string; action: string; requestedAt: Date }>();
    for (const request of pending) {
      if (request.targetUserId) {
        map.set(request.targetUserId, { id: request.id, action: request.action, requestedAt: request.createdAt });
      }
    }
    return map;
  }

  private async notifyActiveSuperAdmins(request: ApprovalRequestEntity, maker: UserEntity): Promise<void> {
    const admins = await this.userRepository.findAllByRole(UserRole.ADMIN);
    const activeAdmins = admins.filter((admin) => admin.status === AccountStatus.ACTIVE);
    const makerName = maker.fullName ?? maker.email ?? 'A staff member';

    await Promise.all(
      activeAdmins.map((admin) =>
        this.notificationsService.createForUser({
          userId: admin.id,
          title: `Approval needed: ${this.describeAction(request.action)}`,
          body: `${makerName} requested to ${this.describeAction(request.action).toLowerCase()} an account. Review it in Settings → Approvals.`,
          relatedEntityType: 'approval_request',
          relatedEntityId: request.id,
        }),
      ),
    );
  }

  private async notifyMaker(
    request: ApprovalRequestEntity,
    outcome: 'approved' | 'rejected',
    decisionNote?: string,
  ): Promise<void> {
    if (!request.makerId) {
      return;
    }
    const suffix = decisionNote ? ` Note: ${decisionNote}` : '';
    await this.notificationsService.createForUser({
      userId: request.makerId,
      title: `Your request was ${outcome}`,
      body: `Your ${this.describeAction(request.action).toLowerCase()} request was ${outcome}.${suffix}`,
      relatedEntityType: 'approval_request',
      relatedEntityId: request.id,
    });
  }

  private describeAction(action: string): string {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private async writeAudit(
    action: string,
    entityId: string | null,
    actorId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        actorId,
        action,
        entityName: 'users',
        entityId,
        metadata,
      }),
    );
  }

  private async toResponseDto(entity: ApprovalRequestEntity): Promise<ApprovalRequestResponseDto> {
    const withRelations = await this.approvalRequestRepository.findOneWithRelations(entity.id);
    return ApprovalRequestResponseDto.fromEntity(withRelations ?? entity);
  }
}
