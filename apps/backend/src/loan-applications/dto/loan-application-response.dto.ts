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
  reviewedByName!: string | null;
  requestedAmount!: string;
  requestedTermMonths!: number;
  purpose!: string | null;
  categoryId!: string | null;
  /** Reserved — see `LOAN_REQUEST_TYPES` in `loan-application.constants.ts`. Only `FRESH_LOAN` is functional today. */
  requestType!: string;
  status!: LoanApplicationStatus;
  submittedAt!: Date;
  reviewedAt!: Date | null;
  rejectionReason!: string | null;
  /** Null = Unassigned. Set/changed only via the Lead Assignment module. */
  assignedToId!: string | null;
  assignedToName!: string | null;
  assignedAt!: Date | null;
  /** The assigned employee's private working notes — never shown to the customer. */
  internalNotes!: string | null;
  internalNotesUpdatedAt!: Date | null;
  /** Customer↔Employee query workflow. */
  queryMessage!: string | null;
  queryRaisedById!: string | null;
  queryRaisedByName!: string | null;
  queryRaisedAt!: Date | null;
  queryRespondedAt!: Date | null;
  /** Waiting-for-Customer visibility — independent of `status`; see LoanApplicationsService.setWaitingForCustomer. */
  waitingForCustomer!: boolean;
  waitingForCustomerSince!: Date | null;
  /** Loan Against Property (`categoryId: 'lap'`) collateral facts — null for every other category. */
  propertyType!: string | null;
  propertyOwnership!: string | null;
  propertyAddress!: string | null;
  propertyValue!: string | null;
  hasExistingLoanOnProperty!: boolean | null;
  existingLoanOutstandingAmount!: string | null;
  loanId?: string;
  loan?: LoanResponseDto;

  static fromEntity(entity: {
    id: string;
    applicantId: string;
    applicant?: { fullName?: string | null } | null;
    reviewedById?: string | null;
    reviewedBy?: { fullName?: string | null } | null;
    requestedAmount: string;
    requestedTermMonths: number;
    purpose?: string | null;
    categoryId?: string | null;
    requestType: string;
    status: LoanApplicationStatus;
    submittedAt: Date;
    reviewedAt?: Date | null;
    rejectionReason?: string | null;
    assignedToId?: string | null;
    assignedTo?: { fullName?: string | null } | null;
    assignedAt?: Date | null;
    internalNotes?: string | null;
    internalNotesUpdatedAt?: Date | null;
    queryMessage?: string | null;
    queryRaisedById?: string | null;
    queryRaisedBy?: { fullName?: string | null } | null;
    queryRaisedAt?: Date | null;
    queryRespondedAt?: Date | null;
    waitingForCustomer: boolean;
    waitingForCustomerSince?: Date | null;
    propertyType?: string | null;
    propertyOwnership?: string | null;
    propertyAddress?: string | null;
    propertyValue?: string | null;
    hasExistingLoanOnProperty?: boolean | null;
    existingLoanOutstandingAmount?: string | null;
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
    dto.reviewedByName = entity.reviewedBy?.fullName ?? null;
    dto.requestedAmount = entity.requestedAmount;
    dto.requestedTermMonths = entity.requestedTermMonths;
    dto.purpose = entity.purpose ?? null;
    dto.categoryId = entity.categoryId ?? null;
    dto.requestType = entity.requestType;
    dto.status = entity.status;
    dto.submittedAt = entity.submittedAt;
    dto.reviewedAt = entity.reviewedAt ?? null;
    dto.rejectionReason = entity.rejectionReason ?? null;
    dto.assignedToId = entity.assignedToId ?? null;
    dto.assignedToName = entity.assignedTo?.fullName ?? null;
    dto.assignedAt = entity.assignedAt ?? null;
    dto.internalNotes = entity.internalNotes ?? null;
    dto.internalNotesUpdatedAt = entity.internalNotesUpdatedAt ?? null;
    dto.queryMessage = entity.queryMessage ?? null;
    dto.queryRaisedById = entity.queryRaisedById ?? null;
    dto.queryRaisedByName = entity.queryRaisedBy?.fullName ?? null;
    dto.queryRaisedAt = entity.queryRaisedAt ?? null;
    dto.queryRespondedAt = entity.queryRespondedAt ?? null;
    dto.waitingForCustomer = entity.waitingForCustomer;
    dto.waitingForCustomerSince = entity.waitingForCustomerSince ?? null;
    dto.propertyType = entity.propertyType ?? null;
    dto.propertyOwnership = entity.propertyOwnership ?? null;
    dto.propertyAddress = entity.propertyAddress ?? null;
    dto.propertyValue = entity.propertyValue ?? null;
    dto.hasExistingLoanOnProperty = entity.hasExistingLoanOnProperty ?? null;
    dto.existingLoanOutstandingAmount = entity.existingLoanOutstandingAmount ?? null;
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
