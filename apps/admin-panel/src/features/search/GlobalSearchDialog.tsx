import type { LoanApplicationStatus, SearchResponse, SearchResult } from '@loan-manager/shared-types';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Icon, type IconName } from '../../components/ui/Icon';
import { backdropVariants, scaleInVariants } from '../../theme/motion';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '../workspace/lead-status-meta';

import styles from './GlobalSearchDialog.module.css';
import { clearRecentSearches, loadRecentSearches, recordRecentSearch } from './recent-searches';
import { fetchSearchResults } from './search-api';

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

const GROUP_ICON: Record<SearchResult['type'], IconName> = {
  application: 'document',
  customer: 'people',
  employee: 'user',
  document: 'upload',
};

const GROUP_LABEL: Record<SearchResult['type'], string> = {
  application: 'Applications',
  customer: 'Customers',
  employee: 'Employees',
  document: 'Documents',
};

function prettify(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function statusDisplay(result: SearchResult): { label: string; color: string } | null {
  if (!result.statusLabel) return null;
  if (result.type === 'application') {
    const status = result.statusLabel as LoanApplicationStatus;
    return {
      label: LEAD_STATUS_LABELS[status] ?? prettify(result.statusLabel),
      color: LEAD_STATUS_COLORS[status] ?? 'var(--color-text-secondary)',
    };
  }
  return { label: prettify(result.statusLabel), color: 'var(--color-text-secondary)' };
}

/**
 * A document result has no standalone preview route — it deep-links to
 * its owning customer's Customer 360 page instead, where the document
 * already appears in the embedded Document Management Center. An
 * employee result deep-links to the Team screen (no individual
 * employee-detail page exists yet) rather than a route that isn't real.
 */
function resolveRoute(result: SearchResult): string {
  switch (result.type) {
    case 'application':
      return `/applications/${result.id}`;
    case 'customer':
      return `/customers/${result.id}`;
    case 'employee':
      return '/settings/team';
    case 'document':
      return result.ownerId ? `/customers/${result.ownerId}` : '/settings/team';
  }
}

/**
 * Global Search — a command-palette style overlay (Ctrl+K/Cmd+K opens
 * it, see `AppLayout`), not a search page. Debounced against
 * `GET /v1/search`, results pre-grouped by the backend. Arrow keys/
 * Enter/Escape all work across the flattened result list regardless of
 * which group a result is in.
 */
export function GlobalSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setDebouncedQuery('');
    setResults(null);
    setError(null);
    setActiveIndex(0);
    setRecentSearches(loadRecentSearches());
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSearchResults(trimmed)
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch(() => {
        if (!cancelled) setError('Search failed. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open, retryToken]);

  const retry = useCallback(() => setRetryToken((token) => token + 1), []);

  const flatResults = useMemo<SearchResult[]>(
    () =>
      results
        ? [...results.applications, ...results.customers, ...results.employees, ...results.documents]
        : [],
    [results],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  function openResult(result: SearchResult): void {
    recordRecentSearch(query);
    onClose();
    navigate(resolveRoute(result));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key === 'ArrowDown' && flatResults.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, flatResults.length - 1));
      return;
    }
    if (event.key === 'ArrowUp' && flatResults.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = flatResults[activeIndex];
      if (selected) openResult(selected);
    }
  }

  const showingRecent = query.trim().length < MIN_QUERY_LENGTH;

  return (
    <AnimatePresence>
      {open && (
        <div className={styles.overlay}>
          <motion.button
            type="button"
            aria-label="Close search"
            className={styles.backdrop}
            onClick={onClose}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          />
          <motion.div
            className={styles.panel}
            variants={scaleInVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
          >
            <div className={styles.inputRow}>
              <Icon name="search" size={18} className={styles.inputIcon} />
              <input
                ref={inputRef}
                type="text"
                className={styles.input}
                placeholder="Search Case Number, Customer, Phone, Email, PAN, Employee, Document…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Search"
              />
              <kbd className={styles.escHint}>ESC</kbd>
            </div>

            <div className={styles.body}>
              {showingRecent ? (
                recentSearches.length === 0 ? (
                  <EmptyState
                    icon="search"
                    message="Start typing to search across applications, customers, employees, and documents."
                  />
                ) : (
                  <div className={styles.recentSection}>
                    <div className={styles.recentHeader}>
                      <span>Recent Searches</span>
                      <button
                        type="button"
                        className={styles.clearButton}
                        onClick={() => {
                          clearRecentSearches();
                          setRecentSearches([]);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                    {recentSearches.map((recent) => (
                      <button
                        key={recent}
                        type="button"
                        className={styles.recentItem}
                        onClick={() => setQuery(recent)}
                      >
                        <Icon name="clock" size={14} />
                        {recent}
                      </button>
                    ))}
                  </div>
                )
              ) : loading ? (
                <LoadingState message="Searching…" />
              ) : error ? (
                <ErrorState message={error} onRetry={retry} />
              ) : !results || flatResults.length === 0 ? (
                <EmptyState icon="search" message="No results found." />
              ) : (
                <>
                  <ResultGroup
                    type="application"
                    results={results.applications}
                    flatResults={flatResults}
                    activeIndex={activeIndex}
                    onSelect={openResult}
                    onHover={setActiveIndex}
                  />
                  <ResultGroup
                    type="customer"
                    results={results.customers}
                    flatResults={flatResults}
                    activeIndex={activeIndex}
                    onSelect={openResult}
                    onHover={setActiveIndex}
                  />
                  <ResultGroup
                    type="employee"
                    results={results.employees}
                    flatResults={flatResults}
                    activeIndex={activeIndex}
                    onSelect={openResult}
                    onHover={setActiveIndex}
                  />
                  <ResultGroup
                    type="document"
                    results={results.documents}
                    flatResults={flatResults}
                    activeIndex={activeIndex}
                    onSelect={openResult}
                    onHover={setActiveIndex}
                  />
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ResultGroup({
  type,
  results,
  flatResults,
  activeIndex,
  onSelect,
  onHover,
}: {
  type: SearchResult['type'];
  results: SearchResult[];
  flatResults: SearchResult[];
  activeIndex: number;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}): JSX.Element | null {
  if (results.length === 0) return null;

  return (
    <div className={styles.group}>
      <div className={styles.groupLabel}>{GROUP_LABEL[type]}</div>
      {results.map((result) => {
        const index = flatResults.indexOf(result);
        const isActive = index === activeIndex;
        const status = statusDisplay(result);
        return (
          <button
            key={`${result.type}-${result.id}`}
            type="button"
            className={isActive ? styles.resultActive : styles.result}
            onClick={() => onSelect(result)}
            onMouseEnter={() => onHover(index)}
          >
            <Icon name={GROUP_ICON[type]} size={18} className={styles.resultIcon} />
            <div className={styles.resultBody}>
              <span className={styles.resultTitle}>{result.title}</span>
              {result.subtitle && <span className={styles.resultSubtitle}>{result.subtitle}</span>}
            </div>
            {result.caseNumber && <span className={styles.caseNumberChip}>{result.caseNumber}</span>}
            {status && (
              <span className={styles.statusChip} style={{ color: status.color }}>
                {status.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
