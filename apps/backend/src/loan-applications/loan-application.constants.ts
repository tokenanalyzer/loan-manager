/**
 * Loan application business rules.
 *
 * Phase 5 scope: simple, explicit bounds enforced at submission time.
 * These are placeholder values for a generic loan product — a real
 * product catalog (multiple loan types with different limits) is
 * future work, not implemented here.
 */
export const LOAN_APPLICATION_RULES = {
  MIN_REQUESTED_AMOUNT: 500,
  MAX_REQUESTED_AMOUNT: 50_000,
  MIN_TERM_MONTHS: 3,
  MAX_TERM_MONTHS: 60,
} as const;
