import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { FollowUpStatus, UserEntity } from '../database/entities';
import { LoanApplicationRepository } from '../loan-applications/loan-application.repository';

import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { UpdateFollowUpStatusDto } from './dto/update-follow-up-status.dto';
import { FollowUpRepository } from './follow-up.repository';

/**
 * FollowUpsService — Employee CRM. Ownership-scoped throughout, the
 * same "Lead Locking" pattern `LoanApplicationsService.updateNotes`
 * already established: a follow-up is only ever visible/editable by
 * the employee it's assigned to, re-checked on every write (not just
 * at the controller's `@Auth`) so a mid-session reassignment away from
 * this employee 403s the next action instead of silently succeeding.
 */
@Injectable()
export class FollowUpsService {
  constructor(
    private readonly followUpRepository: FollowUpRepository,
    // Duplicated lightweight provider — see CustomersModule's own doc
    // comment on this pattern; avoids a module cycle back to
    // LoanApplicationsModule for a single ownership-check read.
    private readonly loanApplicationRepository: LoanApplicationRepository,
  ) {}

  async listForEmployee(employee: UserEntity, status?: FollowUpStatus) {
    return this.followUpRepository.findAllForEmployee(employee.id, status);
  }

  async create(employee: UserEntity, dto: CreateFollowUpDto) {
    const application = await this.loanApplicationRepository.findOneById(dto.loanApplicationId);
    if (!application) {
      throw new NotFoundException('Loan application not found.');
    }
    if (application.assignedToId !== employee.id) {
      throw new ForbiddenException('This lead is not assigned to you.');
    }

    const created = await this.followUpRepository.create({
      loanApplicationId: dto.loanApplicationId,
      createdById: employee.id,
      assignedToId: employee.id,
      note: dto.note,
      dueAt: new Date(dto.dueAt),
      status: FollowUpStatus.PENDING,
    });
    return this.requireWithRelations(created.id);
  }

  async update(id: string, employee: UserEntity, dto: UpdateFollowUpDto) {
    const followUp = await this.getOwnedOrThrow(id, employee);

    await this.followUpRepository.update(followUp.id, {
      ...(dto.note !== undefined ? { note: dto.note } : {}),
      ...(dto.dueAt !== undefined ? { dueAt: new Date(dto.dueAt) } : {}),
    });
    return this.requireWithRelations(followUp.id);
  }

  async updateStatus(id: string, employee: UserEntity, dto: UpdateFollowUpStatusDto) {
    const followUp = await this.getOwnedOrThrow(id, employee);

    const status = dto.status === 'done' ? FollowUpStatus.DONE : FollowUpStatus.CANCELLED;
    await this.followUpRepository.update(followUp.id, {
      status,
      completedAt: new Date(),
    });
    return this.requireWithRelations(followUp.id);
  }

  private async requireWithRelations(id: string) {
    const followUp = await this.followUpRepository.findOneWithRelations(id);
    if (!followUp) {
      throw new NotFoundException('Follow-up not found after update.');
    }
    return followUp;
  }

  private async getOwnedOrThrow(id: string, employee: UserEntity) {
    const followUp = await this.followUpRepository.findOneById(id);
    if (!followUp) {
      throw new NotFoundException('Follow-up not found.');
    }
    if (followUp.assignedToId !== employee.id) {
      throw new ForbiddenException('This follow-up is not assigned to you.');
    }
    return followUp;
  }
}
