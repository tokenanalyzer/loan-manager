import type { LeadSummary } from '@loan-manager/shared-types';

/**
 * Case-insensitive substring match across an application's searchable
 * fields — case number, applicant name, purpose, category. Factored
 * out of `ApplicationsPage` so the Global Search module (Phase 6) can
 * reuse the exact same matching rule against the same already-loaded
 * data, rather than a second, possibly-inconsistent implementation.
 */
export function matchesQuery(lead: LeadSummary, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [lead.caseNumber, lead.applicantName, lead.purpose, lead.categoryId]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(normalized);
}
