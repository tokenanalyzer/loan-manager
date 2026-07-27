import type { LeadSummary } from '@loan-manager/shared-types';

import { getDisplayStatus, LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '../workspace/lead-status-meta';

/**
 * Dashboard aggregation — all derived client-side from the same
 * `GET /v1/loan-applications` response the rest of the dashboard uses
 * (admins see every application, with an eager-loaded `loan` sub-object
 * — see `fetchAllLeads()`). No backend aggregate/reporting endpoint
 * exists, so this is real data computed in the browser, not fabricated
 * — same precedent `activity.ts`'s `deriveRecentActivity` already sets.
 */

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

/** Last `count` calendar months ending with the current one, oldest first. */
function recentMonths(count: number): { key: string; label: string }[] {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: MONTH_LABELS[d.getMonth()] });
  }
  return months;
}

/** Applications submitted vs. loans disbursed, by month — real counts, not currency (matches the reference chart's 0–500-style axis). */
export function computeMonthlyTrends(
  leads: LeadSummary[],
  monthCount = 6,
): { applications: { x: string; y: number }[]; disbursed: { x: string; y: number }[] } {
  const months = recentMonths(monthCount);
  const applicationCounts = new Map(months.map((m) => [m.key, 0]));
  const disbursedCounts = new Map(months.map((m) => [m.key, 0]));

  for (const lead of leads) {
    const submittedKey = monthKey(new Date(lead.submittedAt));
    if (applicationCounts.has(submittedKey)) {
      applicationCounts.set(submittedKey, (applicationCounts.get(submittedKey) ?? 0) + 1);
    }
    if (lead.loan?.disbursedAt) {
      const disbursedKey = monthKey(new Date(lead.loan.disbursedAt));
      if (disbursedCounts.has(disbursedKey)) {
        disbursedCounts.set(disbursedKey, (disbursedCounts.get(disbursedKey) ?? 0) + 1);
      }
    }
  }

  return {
    applications: months.map((m) => ({ x: m.label, y: applicationCounts.get(m.key) ?? 0 })),
    disbursed: months.map((m) => ({ x: m.label, y: disbursedCounts.get(m.key) ?? 0 })),
  };
}

/** Sum of every disbursed (loan.status === 'active') application's principal. */
export function computeDisbursedAmount(leads: LeadSummary[]): number {
  return leads
    .filter((lead) => lead.loan?.status === 'active')
    .reduce((sum, lead) => sum + Number(lead.loan!.principalAmount), 0);
}

/**
 * Month-over-month delta. Returns `null` (no trend) when the previous
 * month has no baseline to compare against — a percentage against zero
 * is not a real trend, so callers must omit the `StatCard` trend
 * indicator entirely rather than show `+∞%` or a fabricated number.
 */
export function computeMonthOverMonthDelta(
  currentMonthValue: number,
  previousMonthValue: number,
): { direction: 'up' | 'down'; percent: number } | null {
  if (previousMonthValue === 0) return null;
  const percent = ((currentMonthValue - previousMonthValue) / previousMonthValue) * 100;
  return { direction: percent >= 0 ? 'up' : 'down', percent: Math.abs(percent) };
}

/** This-month vs. last-month counts for a `submittedAt`-keyed dataset. */
export function computeThisVsLastMonth(leads: LeadSummary[]): { current: number; previous: number } {
  const now = new Date();
  const currentKey = monthKey(now);
  const previousKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  let current = 0;
  let previous = 0;
  for (const lead of leads) {
    const key = monthKey(new Date(lead.submittedAt));
    if (key === currentKey) current += 1;
    else if (key === previousKey) previous += 1;
  }
  return { current, previous };
}

/** This-month vs. last-month disbursed amount. */
export function computeDisbursedThisVsLastMonth(leads: LeadSummary[]): { current: number; previous: number } {
  const now = new Date();
  const currentKey = monthKey(now);
  const previousKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  let current = 0;
  let previous = 0;
  for (const lead of leads) {
    if (lead.loan?.status !== 'active' || !lead.loan.disbursedAt) continue;
    const key = monthKey(new Date(lead.loan.disbursedAt));
    const amount = Number(lead.loan.principalAmount);
    if (key === currentKey) current += amount;
    else if (key === previousKey) previous += amount;
  }
  return { current, previous };
}

/**
 * Real status distribution — the six actual `LoanApplicationStatus`
 * values, with `approved` split into "Awaiting Disbursement"/"Disbursed"
 * via the same `getDisplayStatus` derivation already trusted elsewhere
 * (`lead-status-meta.ts`), not an invented bucket set. Zero-count
 * buckets are left in (value 0) — `DonutChart` itself drops them.
 */
export function computeStatusDistribution(
  leads: LeadSummary[],
): { label: string; value: number; color: string }[] {
  const counts = new Map<string, { value: number; color: string }>();

  for (const lead of leads) {
    const { label, color } =
      lead.status === 'approved' ? getDisplayStatus(lead) : { label: LEAD_STATUS_LABELS[lead.status], color: LEAD_STATUS_COLORS[lead.status] };
    const existing = counts.get(label);
    counts.set(label, { value: (existing?.value ?? 0) + 1, color });
  }

  return Array.from(counts.entries()).map(([label, { value, color }]) => ({ label, value, color }));
}
