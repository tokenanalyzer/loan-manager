import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { FollowUpStatus, type UserEntity } from '../database/entities';
import type { LoanApplicationRepository } from '../loan-applications/loan-application.repository';

import type { FollowUpRepository } from './follow-up.repository';
import { FollowUpsService } from './follow-ups.service';

describe('FollowUpsService', () => {
  const employee = { id: 'employee-1' } as unknown as UserEntity;
  const otherEmployee = { id: 'employee-2' } as unknown as UserEntity;

  function buildService(overrides: {
    followUp?: Record<string, unknown> | null;
    application?: Record<string, unknown> | null;
    withRelations?: Record<string, unknown> | null;
    update?: jest.Mock;
    create?: jest.Mock;
  }) {
    const findOneById = jest.fn().mockResolvedValue(overrides.followUp ?? null);
    const findOneWithRelations = jest.fn().mockResolvedValue(overrides.withRelations ?? { id: 'follow-up-1' });
    const update = overrides.update ?? jest.fn().mockResolvedValue(undefined);
    const create = overrides.create ?? jest.fn().mockResolvedValue({ id: 'follow-up-1' });
    const findAllForEmployee = jest.fn().mockResolvedValue([]);
    const followUpRepository = {
      findOneById,
      findOneWithRelations,
      update,
      create,
      findAllForEmployee,
    } as unknown as FollowUpRepository;

    const findOneByIdApp = jest.fn().mockResolvedValue(overrides.application ?? null);
    const loanApplicationRepository = { findOneById: findOneByIdApp } as unknown as LoanApplicationRepository;

    const service = new FollowUpsService(followUpRepository, loanApplicationRepository);
    return { service, findOneById, findOneWithRelations, update, create, findOneByIdApp, findAllForEmployee };
  }

  describe('create', () => {
    it('creates a follow-up when the lead is assigned to the caller', async () => {
      const { service, create } = buildService({
        application: { id: 'app-1', assignedToId: 'employee-1' },
      });

      await service.create(employee, {
        loanApplicationId: 'app-1',
        note: 'Called, no answer',
        dueAt: '2026-08-01T10:00:00.000Z',
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          loanApplicationId: 'app-1',
          createdById: 'employee-1',
          assignedToId: 'employee-1',
          note: 'Called, no answer',
          status: FollowUpStatus.PENDING,
        }),
      );
    });

    it('rejects a lead not assigned to the caller', async () => {
      const { service } = buildService({ application: { id: 'app-1', assignedToId: 'employee-2' } });

      await expect(
        service.create(employee, { loanApplicationId: 'app-1', note: 'x', dueAt: '2026-08-01T10:00:00.000Z' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('404s on a nonexistent lead', async () => {
      const { service } = buildService({ application: null });

      await expect(
        service.create(employee, { loanApplicationId: 'app-1', note: 'x', dueAt: '2026-08-01T10:00:00.000Z' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update / updateStatus — ownership', () => {
    it('rejects editing a follow-up assigned to someone else', async () => {
      const { service } = buildService({ followUp: { id: 'follow-up-1', assignedToId: otherEmployee.id } });

      await expect(service.update('follow-up-1', employee, { note: 'edited' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejects completing a follow-up assigned to someone else', async () => {
      const { service } = buildService({ followUp: { id: 'follow-up-1', assignedToId: otherEmployee.id } });

      await expect(
        service.updateStatus('follow-up-1', employee, { status: 'done' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows updating a follow-up assigned to the caller', async () => {
      const { service, update } = buildService({
        followUp: { id: 'follow-up-1', assignedToId: employee.id },
      });

      await service.update('follow-up-1', employee, { note: 'edited' });

      expect(update).toHaveBeenCalledWith('follow-up-1', { note: 'edited' });
    });

    it('stamps completedAt and maps status when marking done', async () => {
      const { service, update } = buildService({
        followUp: { id: 'follow-up-1', assignedToId: employee.id },
      });

      await service.updateStatus('follow-up-1', employee, { status: 'done' });

      expect(update).toHaveBeenCalledWith(
        'follow-up-1',
        expect.objectContaining({ status: FollowUpStatus.DONE, completedAt: expect.any(Date) }),
      );
    });

    it('404s on a nonexistent follow-up', async () => {
      const { service } = buildService({ followUp: null });

      await expect(service.update('missing', employee, { note: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listForEmployee', () => {
    it('delegates to the repository, scoped to the caller and optional status', async () => {
      const { service, findAllForEmployee } = buildService({});

      await service.listForEmployee(employee, FollowUpStatus.PENDING);

      expect(findAllForEmployee).toHaveBeenCalledWith('employee-1', FollowUpStatus.PENDING);
    });
  });
});
