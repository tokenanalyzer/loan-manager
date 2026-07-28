import type { LeadSummary } from '@loan-manager/shared-types';

/**
 * Employee Profile → Performance Summary. Mirrors the bucketing
 * `reports-data.ts`'s `computeEmployeePerformance` already does, but
 * that function isn't reusable here — its inputs are the admin-only
 * unfiltered lead list plus the admin-only workload roster, neither of
 * which an EMPLOYEE caller can fetch. This buckets the one list an
 * employee already has: their own `GET /v1/loan-applications`
 * response (server-scoped to their assignments), so no new backend
 * endpoint is needed.
 */
export interface MyPerformanceSummary {
  assigned: number;
  approved: number;
  rejected: number;
  disbursed: number;
  /** `null` when nothing is assigned yet — a rate against zero isn't a real rate. */
  approvalRate: number | null;
}

export function computeMyPerformanceSummary(leads: LeadSummary[]): MyPerformanceSummary {
  const assigned = leads.length;
  const approved = leads.filter((lead) => lead.status === 'approved').length;
  const rejected = leads.filter((lead) => lead.status === 'rejected').length;
  const disbursed = leads.filter((lead) => lead.loan?.status === 'active').length;

  return {
    assigned,
    approved,
    rejected,
    disbursed,
    approvalRate: assigned > 0 ? (approved / assigned) * 100 : null,
  };
}
