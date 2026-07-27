import { useEffect, useState } from 'react';

import { fetchPendingApprovals } from '../features/approvals/approvals-api';
import { fetchUnassignedLeads } from '../features/leads/leads-api';

/**
 * Live counts for the two Sidebar nav items the reference design shows
 * a badge on (Leads, Approvals) — sourced from endpoints already used
 * elsewhere (`fetchUnassignedLeads`, `fetchPendingApprovals`), fetched
 * once on mount. No backend change; no polling (kept light — this runs
 * on every authenticated page load via `AppLayout`).
 */
export function useNavCounts(enabled: boolean): { leads: number | undefined; approvals: number | undefined } {
  const [leads, setLeads] = useState<number | undefined>(undefined);
  const [approvals, setApprovals] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    fetchUnassignedLeads()
      .then((items) => {
        if (!cancelled) setLeads(items.length);
      })
      .catch(() => undefined);

    fetchPendingApprovals({ status: 'pending', page: 1, pageSize: 1 })
      .then((result) => {
        if (!cancelled) setApprovals(result.meta.totalItems);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { leads, approvals };
}
