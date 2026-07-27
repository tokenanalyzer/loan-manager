import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { AccountStatus, ApprovalRequestStatus, AuditLogEntity } from '../database/entities';
import type { NotificationsService } from '../notifications/notifications.service';
import type { UserRepository } from '../users/user.repository';

import type { ApprovalActionExecutorRegistry } from './approval-action-executor.interface';
import type { ApprovalRequestRepository } from './approval-request.repository';
import { ApprovalsService } from './approvals.service';

/**
 * Covers the maker-checker workflow engine itself, independent of which
 * domain action is gated — `MakerCheckerPolicyService` (which
 * role/action pairs get gated) and the staff-lifecycle executors
 * (what actually runs on approval) each have their own dedicated spec.
 */
describe('ApprovalsService', () => {
  const maker = { id: 'maker-1', fullName: 'Org Admin' } as never;
  const checker = { id: 'checker-1', fullName: 'Super Admin' } as never;

  function buildRequest(overrides: Record<string, unknown> = {}) {
    return {
      id: 'request-1',
      action: 'staff_disable',
      targetUserId: 'target-1',
      makerId: 'maker-1',
      checkerId: null,
      status: ApprovalRequestStatus.PENDING,
      payload: { reason: 'Under investigation' },
      decisionNote: null,
      failureReason: null,
      createdAt: new Date('2026-01-01'),
      decidedAt: null,
      ...overrides,
    };
  }

  /** Stateful: `update`/`create` mutate `state`, `findOneWithRelations`/`findOneById` read it back — so a response DTO built after a decision reflects that decision, the same way the real repository would. */
  function buildHarness() {
    let state = buildRequest();

    const findPending = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockImplementation((data) => {
      state = buildRequest(data);
      return Promise.resolve(state);
    });
    const update = jest.fn().mockImplementation((id, patch) => {
      state = { ...state, id, ...patch };
      return Promise.resolve(state);
    });
    const findOneWithRelations = jest.fn().mockImplementation((id) => Promise.resolve({ ...state, id }));
    const findOneById = jest.fn().mockImplementation((id) => Promise.resolve({ ...state, id }));
    const approvalRequestRepository = {
      findPending,
      create,
      update,
      findOneWithRelations,
      findOneById,
    } as unknown as ApprovalRequestRepository;

    const findAllByRole = jest.fn().mockResolvedValue([]);
    const findOneByIdUser = jest.fn().mockResolvedValue(maker);
    const userRepository = { findAllByRole, findOneById: findOneByIdUser } as unknown as UserRepository;

    const executorExecute = jest.fn().mockResolvedValue({ ok: true });
    const get = jest.fn().mockReturnValue({ execute: executorExecute });
    const executorRegistry = { get } as unknown as ApprovalActionExecutorRegistry;

    const createForUser = jest.fn().mockResolvedValue(undefined);
    const notificationsService = { createForUser } as unknown as NotificationsService;

    const auditLogCreate = jest.fn().mockImplementation((data) => data);
    const auditLogSave = jest.fn().mockResolvedValue(undefined);
    const auditLogRepository = {
      create: auditLogCreate,
      save: auditLogSave,
    } as unknown as Repository<AuditLogEntity>;

    const service = new ApprovalsService(
      approvalRequestRepository,
      userRepository,
      executorRegistry,
      notificationsService,
      auditLogRepository,
    );

    return {
      service,
      findPending,
      create,
      update,
      findOneWithRelations,
      findOneById,
      findAllByRole,
      findOneByIdUser,
      executorExecute,
      get,
      createForUser,
      auditLogCreate,
      auditLogSave,
    };
  }

  describe('createRequest', () => {
    it('writes a pending row, an audit row, and notifies every active Super Admin (not disabled/archived ones)', async () => {
      const { service, create, auditLogCreate, createForUser, findAllByRole } = buildHarness();
      findAllByRole.mockResolvedValue([
        { id: 'admin-active-1', fullName: 'Active Admin', status: AccountStatus.ACTIVE },
        { id: 'admin-disabled', fullName: 'Disabled Admin', status: AccountStatus.DISABLED },
        { id: 'admin-archived', fullName: 'Archived Admin', status: AccountStatus.ARCHIVED },
      ]);

      await service.createRequest({
        action: 'staff_disable',
        targetUserId: 'target-1',
        maker,
        payload: { reason: 'Under investigation' },
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'staff_disable',
          targetUserId: 'target-1',
          makerId: 'maker-1',
          status: ApprovalRequestStatus.PENDING,
        }),
      );
      expect(auditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'staff_disable_requested',
          actorId: 'maker-1',
          entityName: 'users',
          entityId: 'target-1',
        }),
      );
      expect(createForUser).toHaveBeenCalledTimes(1);
      expect(createForUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'admin-active-1', relatedEntityType: 'approval_request' }),
      );
    });

    it('rejects a duplicate pending request for the same (target, action) pair', async () => {
      const { service, findPending, create } = buildHarness();
      findPending.mockResolvedValue(buildRequest());

      await expect(
        service.createRequest({ action: 'staff_disable', targetUserId: 'target-1', maker, payload: {} }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('decide', () => {
    it('approve: calls the registered executor, flips status to approved, writes an audit row, notifies the maker', async () => {
      const { service, get, executorExecute, update, auditLogCreate, createForUser } = buildHarness();

      const { request, result } = await service.decide('request-1', checker, { decision: 'approve' });

      expect(get).toHaveBeenCalledWith('staff_disable');
      expect(executorExecute).toHaveBeenCalledWith('target-1', { reason: 'Under investigation' }, maker);
      expect(update).toHaveBeenCalledWith(
        'request-1',
        expect.objectContaining({ status: ApprovalRequestStatus.APPROVED, checkerId: 'checker-1' }),
      );
      expect(auditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'staff_disable_approved', actorId: 'checker-1' }),
      );
      expect(createForUser).toHaveBeenCalledWith(expect.objectContaining({ userId: 'maker-1' }));
      expect(request.status).toBe(ApprovalRequestStatus.APPROVED);
      expect(result).toEqual({ ok: true });
    });

    it('reject: never calls the executor, flips status to rejected', async () => {
      const { service, get, update, auditLogCreate } = buildHarness();

      const { request } = await service.decide('request-1', checker, {
        decision: 'reject',
        decisionNote: 'Not enough evidence',
      });

      expect(get).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith(
        'request-1',
        expect.objectContaining({ status: ApprovalRequestStatus.REJECTED, decisionNote: 'Not enough evidence' }),
      );
      expect(auditLogCreate).toHaveBeenCalledWith(expect.objectContaining({ action: 'staff_disable_rejected' }));
      expect(request.status).toBe(ApprovalRequestStatus.REJECTED);
    });

    it('throws ConflictException when the request has already been decided', async () => {
      const { service, findOneWithRelations } = buildHarness();
      findOneWithRelations.mockResolvedValue(buildRequest({ status: ApprovalRequestStatus.APPROVED }));

      await expect(service.decide('request-1', checker, { decision: 'approve' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws NotFoundException when the request does not exist', async () => {
      const { service, findOneWithRelations } = buildHarness();
      findOneWithRelations.mockResolvedValue(null);

      await expect(service.decide('missing', checker, { decision: 'approve' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('blocks self-approval — a checker cannot decide their own request — independent of role policy', async () => {
      const { service, findOneWithRelations } = buildHarness();
      findOneWithRelations.mockResolvedValue(buildRequest({ makerId: 'checker-1' }));

      await expect(service.decide('request-1', checker, { decision: 'approve' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('records a FAILED status with failureReason when the executor throws (a precondition drifted since the request was created)', async () => {
      const { service, get, update, auditLogCreate } = buildHarness();
      const failingExecutor = {
        execute: jest.fn().mockRejectedValue(new ConflictException('This account is already disabled.')),
      };
      get.mockReturnValue(failingExecutor);

      await expect(service.decide('request-1', checker, { decision: 'approve' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(update).toHaveBeenCalledWith(
        'request-1',
        expect.objectContaining({
          status: ApprovalRequestStatus.FAILED,
          failureReason: 'This account is already disabled.',
        }),
      );
      expect(auditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'staff_disable_approval_failed' }),
      );
    });
  });

  describe('withdraw', () => {
    it('allows the original maker to withdraw their own still-pending request', async () => {
      const { service, update, auditLogCreate } = buildHarness();

      const result = await service.withdraw('request-1', maker);

      expect(update).toHaveBeenCalledWith(
        'request-1',
        expect.objectContaining({ status: ApprovalRequestStatus.WITHDRAWN }),
      );
      expect(auditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'staff_disable_withdrawn', actorId: 'maker-1' }),
      );
      expect(result.status).toBe(ApprovalRequestStatus.WITHDRAWN);
    });

    it('rejects withdrawal by anyone other than the original maker', async () => {
      const { service } = buildHarness();

      await expect(service.withdraw('request-1', checker)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects withdrawing a request that has already been decided', async () => {
      const { service, findOneById } = buildHarness();
      findOneById.mockResolvedValue(buildRequest({ status: ApprovalRequestStatus.APPROVED }));

      await expect(service.withdraw('request-1', maker)).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
