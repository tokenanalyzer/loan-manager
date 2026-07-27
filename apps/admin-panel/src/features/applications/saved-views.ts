import type { LoanApplicationStatus } from '@loan-manager/shared-types';

/**
 * Saved Views — named filter presets for the Applications list.
 * Deliberately client-only (localStorage), not a new backend domain:
 * this is a personal convenience, not shared/team state, so no server
 * persistence is warranted.
 */
export interface ApplicationsFilterState {
  query: string;
  statuses: LoanApplicationStatus[];
  categoryFilter: string;
  assignmentFilter: 'all' | 'assigned' | 'unassigned';
  dateFrom: string;
  dateTo: string;
}

export interface SavedView {
  name: string;
  filters: ApplicationsFilterState;
}

const STORAGE_KEY = 'admin-panel:applications:saved-views';

export function loadSavedViews(): SavedView[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SavedView[]) : [];
  } catch {
    return [];
  }
}

export function saveSavedView(view: SavedView): SavedView[] {
  const existing = loadSavedViews().filter((v) => v.name !== view.name);
  const next = [...existing, view];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteSavedView(name: string): SavedView[] {
  const next = loadSavedViews().filter((v) => v.name !== name);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
