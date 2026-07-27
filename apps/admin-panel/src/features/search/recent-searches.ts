/**
 * Recent Searches — client-only (localStorage), same convention as
 * Applications' Saved Views (`features/applications/saved-views.ts`):
 * personal convenience, not shared/team state, so no backend
 * persistence is warranted.
 */

const STORAGE_KEY = 'admin-panel:global-search:recent';
const MAX_RECENT = 10;

export function loadRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** Records a completed search — most-recent-first, deduplicated, capped at 10. */
export function recordRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return loadRecentSearches();

  const existing = loadRecentSearches().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...existing].slice(0, MAX_RECENT);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearRecentSearches(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
