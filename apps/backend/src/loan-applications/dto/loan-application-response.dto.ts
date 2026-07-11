import { LoanApplicationStatus } from '../../database/entities';

export class LoanApplicationResponseDto {
  id!: string;
  applicantId!: string;
  reviewedById!: string | null;
  requestedAmount!: string;
  requestedTermMonths!: number;
  purpose!: string | null;
  status!: LoanApplicationStatus;
  submittedAt!: Date;
  reviewedAt!: Date | null;
  loanId?: string;

  static fromEntity(entity: {
    id: string;
    applicantId: string;
    reviewedById?: string | null;
    requestedAmount: string;
    requestedTermMonths: number;
    purpose?: string | null;
    status: LoanApplicationStatus;
    submittedAt: Date;
    reviewedAt?: Date | null;
    loan?: { id: string } | null;
  }): LoanApplicationResponseDto {
    const dto = new LoanApplicationResponseDto();
    dto.id = entity.id;
    dto.applicantId = entity.applicantId;
    dto.reviewedById = entity.reviewedById ?? null;
    dto.requestedAmount = entity.requestedAmount;
    dto.requestedTermMonths = entity.requestedTermMonths;
    dto.purpose = entity.purpose ?? null;
    dto.status = entity.status;
    dto.submittedAt = entity.submittedAt;
    dto.reviewedAt = entity.reviewedAt ?? null;
    dto.loanId = entity.loan?.id;
    return dto;
  }
}
