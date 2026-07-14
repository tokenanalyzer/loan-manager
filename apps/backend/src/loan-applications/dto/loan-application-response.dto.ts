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
  reviewedById!: string | null;
  requestedAmount!: string;
  requestedTermMonths!: number;
  purpose!: string | null;
  categoryId!: string | null;
  status!: LoanApplicationStatus;
  submittedAt!: Date;
  reviewedAt!: Date | null;
  loanId?: string;
  loan?: LoanResponseDto;

  static fromEntity(entity: {
    id: string;
    applicantId: string;
    reviewedById?: string | null;
    requestedAmount: string;
    requestedTermMonths: number;
    purpose?: string | null;
    categoryId?: string | null;
    status: LoanApplicationStatus;
    submittedAt: Date;
    reviewedAt?: Date | null;
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
    dto.reviewedById = entity.reviewedById ?? null;
    dto.requestedAmount = entity.requestedAmount;
    dto.requestedTermMonths = entity.requestedTermMonths;
    dto.purpose = entity.purpose ?? null;
    dto.categoryId = entity.categoryId ?? null;
    dto.status = entity.status;
    dto.submittedAt = entity.submittedAt;
    dto.reviewedAt = entity.reviewedAt ?? null;
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
