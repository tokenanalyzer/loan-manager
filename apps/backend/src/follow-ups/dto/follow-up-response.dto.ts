import { FollowUpStatus } from '../../database/entities';

/** One follow-up, with just enough of its parent lead denormalized to render a list without a second fetch. */
export class FollowUpResponseDto {
  id!: string;
  loanApplicationId!: string;
  caseNumber!: string;
  applicantName!: string | null;
  note!: string;
  dueAt!: Date;
  status!: FollowUpStatus;
  completedAt!: Date | null;
  createdAt!: Date;

  static fromEntity(entity: {
    id: string;
    loanApplicationId: string;
    loanApplication?: { caseNumber: string; applicant?: { fullName?: string | null } | null } | null;
    note: string;
    dueAt: Date;
    status: FollowUpStatus;
    completedAt?: Date | null;
    createdAt: Date;
  }): FollowUpResponseDto {
    const dto = new FollowUpResponseDto();
    dto.id = entity.id;
    dto.loanApplicationId = entity.loanApplicationId;
    dto.caseNumber = entity.loanApplication?.caseNumber ?? '';
    dto.applicantName = entity.loanApplication?.applicant?.fullName ?? null;
    dto.note = entity.note;
    dto.dueAt = entity.dueAt;
    dto.status = entity.status;
    dto.completedAt = entity.completedAt ?? null;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
