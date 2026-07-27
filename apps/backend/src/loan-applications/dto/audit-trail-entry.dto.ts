import type { AuditLogEntity, LeadAssignmentEntity } from '../../database/entities';

/**
 * One row of an application's Audit Trail — a raw, structured event
 * log distinct from the human-readable Timeline (`buildTimeline` on
 * the frontend). Merges two already-real sources rather than adding a
 * third: `AuditLogEntity` (review/reject/query/disburse decisions,
 * already written by `LoanApplicationsService`) and
 * `LeadAssignmentEntity` (assign/reassign/transfer, already written by
 * `LeadAssignmentService`) — no new write path was needed for either.
 */
export class AuditTrailEntryDto {
  id!: string;
  source!: 'decision' | 'assignment';
  action!: string;
  actorId!: string | null;
  actorName!: string | null;
  metadata!: Record<string, unknown> | null;
  createdAt!: Date;

  static fromAuditLog(entity: AuditLogEntity): AuditTrailEntryDto {
    const dto = new AuditTrailEntryDto();
    dto.id = entity.id;
    dto.source = 'decision';
    dto.action = entity.action;
    dto.actorId = entity.actorId ?? null;
    dto.actorName = entity.actor?.fullName ?? null;
    dto.metadata = entity.metadata ?? null;
    dto.createdAt = entity.createdAt;
    return dto;
  }

  static fromAssignment(entity: LeadAssignmentEntity): AuditTrailEntryDto {
    const dto = new AuditTrailEntryDto();
    dto.id = entity.id;
    dto.source = 'assignment';
    dto.action = entity.action;
    dto.actorId = entity.assignedById ?? null;
    dto.actorName = entity.assignedBy?.fullName ?? null;
    dto.metadata = {
      previousEmployeeName: entity.previousAssignee?.fullName ?? null,
      newEmployeeName: entity.newAssignee?.fullName ?? null,
    };
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
