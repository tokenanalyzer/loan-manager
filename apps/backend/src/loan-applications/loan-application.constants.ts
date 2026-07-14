/**
 * Loan application business rules — Indian retail-lending ranges
 * (2025-26 typical bank/NBFC figures, not a specific lender's actual
 * published rates).
 *
 * `LOAN_APPLICATION_RULES` is the outer safety-net bound applied to
 * every submission regardless of category. `LOAN_CATEGORY_BOUNDS`
 * gives each category its own (tighter) amount/term range, checked in
 * `LoanApplicationsService.submit()` when the client sends a
 * `categoryId` — this mirrors `kLoanCategories` in
 * `packages/shared-flutter/lib/src/models/loan_category.dart` (shared
 * by both Flutter apps). Six categories: personal, home, business,
 * education, vehicle, gold — Home Loan's long tenure/high ceiling is
 * why the global outer bounds are as wide as they are.
 *
 * This duplication (category data living in both the shared Flutter
 * package and here) is intentional-for-now, not an oversight: there is no real
 * product-catalog table yet. See docs/architecture-review-2026-07.md
 * for the recommendation to replace both with one shared table.
 */
export const LOAN_APPLICATION_RULES = {
  MIN_REQUESTED_AMOUNT: 10_000,
  MAX_REQUESTED_AMOUNT: 5_00_00_000,
  MIN_TERM_MONTHS: 3,
  MAX_TERM_MONTHS: 360,
} as const;

export interface LoanCategoryBounds {
  minAmount: number;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  processingFeePercent: number;
}

export const LOAN_CATEGORY_BOUNDS: Record<string, LoanCategoryBounds> = {
  personal: {
    minAmount: 25_000,
    maxAmount: 15_00_000,
    minTermMonths: 6,
    maxTermMonths: 60,
    processingFeePercent: 0.02,
  },
  home: {
    minAmount: 5_00_000,
    maxAmount: 5_00_00_000,
    minTermMonths: 60,
    maxTermMonths: 360,
    processingFeePercent: 0.005,
  },
  business: {
    minAmount: 1_00_000,
    maxAmount: 50_00_000,
    minTermMonths: 12,
    maxTermMonths: 60,
    processingFeePercent: 0.02,
  },
  education: {
    minAmount: 25_000,
    maxAmount: 40_00_000,
    minTermMonths: 12,
    maxTermMonths: 120,
    processingFeePercent: 0.01,
  },
  vehicle: {
    minAmount: 50_000,
    maxAmount: 25_00_000,
    minTermMonths: 12,
    maxTermMonths: 84,
    processingFeePercent: 0.01,
  },
  gold: {
    minAmount: 10_000,
    maxAmount: 25_00_000,
    minTermMonths: 3,
    maxTermMonths: 36,
    processingFeePercent: 0.01,
  },
};
