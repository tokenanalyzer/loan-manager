export type SearchResultType = 'application' | 'customer' | 'employee' | 'document';

/**
 * Mirrors the backend's `SearchResultDto`. `statusLabel` for an
 * `application` result is the raw `LoanApplicationStatus` enum value —
 * map it through `LEAD_STATUS_LABELS`/`LEAD_STATUS_COLORS`
 * (`features/workspace/lead-status-meta.ts`) for display, same as
 * every other application list in this app. `ownerId` is only set for
 * `document` results (the customer that document belongs to).
 */
export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  statusLabel: string | null;
  caseNumber: string | null;
  ownerId: string | null;
}

/** Mirrors the backend's `SearchResponseDto` — `GET /v1/search?q=...`, pre-grouped. */
export interface SearchResponse {
  applications: SearchResult[];
  customers: SearchResult[];
  employees: SearchResult[];
  documents: SearchResult[];
}
