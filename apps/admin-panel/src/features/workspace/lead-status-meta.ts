import type { LeadSummary, LoanApplicationStatus } from '@loan-manager/shared-types';

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

/**
 * Display-only status label/color for a lead list row — the Loan
 * Application's own `status` never becomes "disbursed" (that's a fact
 * about the linked Loan, not the application); this derives the label a
 * reviewer actually wants to see: "Disbursed" once the loan is ACTIVE,
 * "Awaiting Disbursement" once approved but the loan is still PENDING,
 * otherwise the normal application status.
 */
export function getDisplayStatus(lead: LeadSummary): { label: string; color: string } {
  if (lead.status === 'approved' && lead.loan?.status === 'active') {
    return { label: 'Disbursed', color: 'var(--color-success)' };
  }
  if (lead.status === 'approved' && lead.loan?.status === 'pending') {
    return { label: 'Awaiting Disbursement', color: 'var(--color-warning)' };
  }
  return { label: LEAD_STATUS_LABELS[lead.status], color: LEAD_STATUS_COLORS[lead.status] };
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}
