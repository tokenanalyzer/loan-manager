import type { LoanApplicationStatus } from '@loan-manager/shared-types';

export const LEAD_STATUS_LABELS: Record<LoanApplicationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  query_raised: 'Query Raised',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const LEAD_STATUS_COLORS: Record<LoanApplicationStatus, string> = {
  submitted: 'var(--color-warning)',
  under_review: 'var(--color-primary)',
  query_raised: 'var(--color-accent-gold)',
  approved: 'var(--color-success)',
  rejected: 'var(--color-error)',
  withdrawn: 'var(--color-text-tertiary)',
};

/** Statuses an employee can still make a decision on (Approve/Reject/Raise Query). */
export const REVIEWABLE_STATUSES: LoanApplicationStatus[] = ['submitted', 'under_review'];

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}
