export type SearchResultType = 'application' | 'customer' | 'employee' | 'document';

/**
 * One Global Search result row. `ownerId` is only ever set for
 * `document` results — the frontend has no standalone document-preview
 * route, so a document result deep-links to its owning customer's
 * Customer 360 page instead (see `IMPLEMENTATION_PROGRESS.md`'s
 * Phase 6 write-up for why).
 */
export class SearchResultDto {
  type!: SearchResultType;
  id!: string;
  title!: string;
  subtitle!: string | null;
  statusLabel!: string | null;
  caseNumber!: string | null;
  ownerId!: string | null;
}

/** `GET /v1/search` response — pre-grouped, matching the command palette's own grouped display. */
export class SearchResponseDto {
  applications!: SearchResultDto[];
  customers!: SearchResultDto[];
  employees!: SearchResultDto[];
  documents!: SearchResultDto[];
}
