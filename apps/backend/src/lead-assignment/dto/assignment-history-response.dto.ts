import { LeadAssignmentAction } from '../../database/entities';

/** Requirement 7's "complete assignment history": assigned by/to, previous/new employee, date & time. */
export class AssignmentHistoryResponseDto {
  id!: string;
  action!: LeadAssignmentAction;
  assignedById!: string | null;
  assignedByName!: string | null;
  previousEmployeeId!: string | null;
  previousEmployeeName!: string | null;
  newEmployeeId!: string;
  newEmployeeName!: string | null;
  createdAt!: Date;

  static fromEntity(entity: {
    id: string;
    action: LeadAssignmentAction;
    assignedById?: string | null;
    assignedBy?: { fullName?: string | null } | null;
    previousAssigneeId?: string | null;
    previousAssignee?: { fullName?: string | null } | null;
    newAssigneeId: string;
    newAssignee?: { fullName?: string | null } | null;
    createdAt: Date;
  }): AssignmentHistoryResponseDto {
    const dto = new AssignmentHistoryResponseDto();
    dto.id = entity.id;
    dto.action = entity.action;
    dto.assignedById = entity.assignedById ?? null;
    dto.assignedByName = entity.assignedBy?.fullName ?? null;
    dto.previousEmployeeId = entity.previousAssigneeId ?? null;
    dto.previousEmployeeName = entity.previousAssignee?.fullName ?? null;
    dto.newEmployeeId = entity.newAssigneeId;
    dto.newEmployeeName = entity.newAssignee?.fullName ?? null;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
