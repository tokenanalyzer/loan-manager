import { LoanApplicationStatus, LoanStatus } from '../../database/entities';
import { calculateEmi } from '../utils/emi.util';

export class LoanResponseDto {
  id!: string;
  loanNumber!: string;
  principalAmount!: string;
  interestRate!: string;
  termMonths!: number;
  status!: LoanStatus;
  disbursedAt!: Date | null;
  maturityDate!: string | null;
  monthlyInstallment!: number;
  totalInterest!: number;
  totalPayable!: number;
}

export class LoanApplicationResponseDto {
  id!: string;
  applicantId!: string;
  applicantName!: string | null;
  reviewedById!: string | null;
  requestedAmount!: string;
  requestedTermMonths!: number;
  purpose!: string | null;
  categoryId!: string | null;
  status!: LoanApplicationStatus;
  submittedAt!: Date;
  reviewedAt!: Date | null;
  /** Null = Unassigned. Set/changed only via the Lead Assignment module. */
  assignedToId!: string | null;
  assignedToName!: string | null;
  assignedAt!: Date | null;
  /** The assigned employee's private working notes — never shown to the customer. */
  internalNotes!: string | null;
  internalNotesUpdatedAt!: Date | null;
  loanId?: string;
  loan?: LoanResponseDto;

  static fromEntity(entity: {
    id: string;
    applicantId: string;
    applicant?: { fullName?: string | null } | null;
    reviewedById?: string | null;
    requestedAmount: string;
    requestedTermMonths: number;
    purpose?: string | null;
    categoryId?: string | null;
    status: LoanApplicationStatus;
    submittedAt: Date;
    reviewedAt?: Date | null;
    assignedToId?: string | null;
    assignedTo?: { fullName?: string | null } | null;
    assignedAt?: Date | null;
    internalNotes?: string | null;
    internalNotesUpdatedAt?: Date | null;
    loan?: {
      id: string;
      loanNumber: string;
      principalAmount: string;
      interestRate: string;
      termMonths: number;
      status: LoanStatus;
      disbursedAt?: Date | null;
      maturityDate?: string | null;
    } | null;
  }): LoanApplicationResponseDto {
    const dto = new LoanApplicationResponseDto();
    dto.id = entity.id;
    dto.applicantId = entity.applicantId;
    dto.applicantName = entity.applicant?.fullName ?? null;
    dto.reviewedById = entity.reviewedById ?? null;
    dto.requestedAmount = entity.requestedAmount;
    dto.requestedTermMonths = entity.requestedTermMonths;
    dto.purpose = entity.purpose ?? null;
    dto.categoryId = entity.categoryId ?? null;
    dto.status = entity.status;
    dto.submittedAt = entity.submittedAt;
    dto.reviewedAt = entity.reviewedAt ?? null;
    dto.assignedToId = entity.assignedToId ?? null;
    dto.assignedToName = entity.assignedTo?.fullName ?? null;
    dto.assignedAt = entity.assignedAt ?? null;
    dto.internalNotes = entity.internalNotes ?? null;
    dto.internalNotesUpdatedAt = entity.internalNotesUpdatedAt ?? null;
    dto.loanId = entity.loan?.id;

    if (entity.loan) {
      const emi = calculateEmi(
        Number(entity.loan.principalAmount),
        Number(entity.loan.interestRate),
        entity.loan.termMonths,
      );

      const loanDto = new LoanResponseDto();
      loanDto.id = entity.loan.id;
      loanDto.loanNumber = entity.loan.loanNumber;
      loanDto.principalAmount = entity.loan.principalAmount;
      loanDto.interestRate = entity.loan.interestRate;
      loanDto.termMonths = entity.loan.termMonths;
      loanDto.status = entity.loan.status;
      loanDto.disbursedAt = entity.loan.disbursedAt ?? null;
      loanDto.maturityDate = entity.loan.maturityDate ?? null;
      loanDto.monthlyInstallment = emi.monthlyInstallment;
      loanDto.totalInterest = emi.totalInterest;
      loanDto.totalPayable = emi.totalPayable;
      dto.loan = loanDto;
    }

    return dto;
  }
}
