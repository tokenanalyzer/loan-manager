import type { DocumentVerificationStatus } from '@loan-manager/shared-types';

/**
 * Shared label/color source for document verification status + category,
 * used by both `DocumentCenterPage` and Reports' Document Verification
 * Statistics widget (`reports-data.ts`) — same "single source of truth"
 * precedent as `workspace/lead-status-meta.ts` for applications.
 */
export const STATUS_LABEL: Record<DocumentVerificationStatus, string> = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
  reupload_requested: 'Re-upload Requested',
};

export const STATUS_COLOR: Record<DocumentVerificationStatus, string> = {
  pending: 'var(--color-warning)',
  verified: 'var(--color-success)',
  rejected: 'var(--color-error)',
  reupload_requested: 'var(--color-accent-gold)',
};

export const CATEGORY_LABEL: Record<string, string> = {
  identity: 'Identity',
  income: 'Income',
  employment: 'Employment',
  balance_transfer: 'Balance Transfer',
  loan_specific: 'Loan Specific',
  photo: 'Photo',
  other: 'Other',
};
