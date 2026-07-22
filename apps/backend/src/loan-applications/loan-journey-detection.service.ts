import { Injectable } from '@nestjs/common';

import { CustomersService } from '../customers/customers.service';

import { DEFAULT_LOAN_REQUEST_TYPE, LoanRequestType } from './loan-application.constants';
import { LoanRepository } from './loan.repository';

/**
 * LoanJourneyDetectionService — determines a Personal Loan
 * application's `requestType` (Fresh / Top-Up / Balance Transfer /
 * BT+Top-Up) automatically, so the customer is never asked to pick one
 * (see `LoanApplicationsService.submit`, which calls this and ignores
 * any client-sent `requestType` for `categoryId === 'personal'`).
 *
 * Detection rests on exactly two signals:
 *  - `LoanRepository.hasActivePersonalLoan` — an existing *disbursed*
 *    personal loan with us (Top-Up eligibility). Always false today —
 *    no disbursement workflow exists yet, so no loan ever reaches
 *    `ACTIVE`. Starts working the moment one does, with no code change
 *    here.
 *  - `CustomerProfileEntity.hasActiveExternalLoan` — the customer
 *    self-declaring an existing loan with another lender (Balance
 *    Transfer eligibility), captured via the Customer App's
 *    profile-edit "Existing obligations" section. Starts working the
 *    moment a customer fills that in.
 *
 * `BT_FRESH` (reserved in `LOAN_REQUEST_TYPES` but not part of this
 * detection) is intentionally not produced here — it wasn't part of
 * the four journeys this service was asked to support (Fresh, Top-Up,
 * Balance Transfer, BT+Top-Up); it stays reserved/unused like it was
 * before this service existed.
 */
@Injectable()
export class LoanJourneyDetectionService {
  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly customersService: CustomersService,
  ) {}

  async detect(applicantId: string, categoryId: string | null | undefined): Promise<LoanRequestType> {
    if (categoryId !== 'personal') {
      return DEFAULT_LOAN_REQUEST_TYPE;
    }

    const [hasActiveLoanWithUs, profile] = await Promise.all([
      this.loanRepository.hasActivePersonalLoan(applicantId),
      this.customersService.getCustomerProfileById(applicantId),
    ]);
    const hasExternalLoan = profile?.hasActiveExternalLoan === true;

    if (hasActiveLoanWithUs && hasExternalLoan) return 'BT_TOPUP';
    if (hasActiveLoanWithUs) return 'TOP_UP';
    if (hasExternalLoan) return 'BALANCE_TRANSFER';
    return 'FRESH_LOAN';
  }
}
