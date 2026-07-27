/**
 * Mirrors the backend's `AuditTrailEntryDto` — one row of an
 * application's Audit Trail (`GET /v1/loan-applications/:id/audit-trail`).
 * A raw, structured event log distinct from the human-readable
 * Timeline: merges decision events (approve/reject/query/disburse)
 * with ownership-change events (assign/reassign/transfer).
 */
export interface AuditTrailEntry {
  id: string;
  source: 'decision' | 'assignment';
  action: string;
  actorId: string | null;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
