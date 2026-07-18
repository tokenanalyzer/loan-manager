import type { LoanApplicationStatus } from '@loan-manager/shared-types';

export const LEAD_STATUS_LABELS: Record<LoanApplicationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const LEAD_STATUS_COLORS: Record<LoanApplicationStatus, string> = {
  submitted: 'var(--color-warning)',
  under_review: 'var(--color-primary)',
  approved: 'var(--color-success)',
  rejected: 'var(--color-error)',
  withdrawn: 'var(--color-text-tertiary)',
};

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}
