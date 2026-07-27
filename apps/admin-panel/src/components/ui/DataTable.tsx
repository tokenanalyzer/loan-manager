import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { EmptyState } from '../states/EmptyState';
import { ErrorState } from '../states/ErrorState';

import { Button } from './Button';
import styles from './DataTable.module.css';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Omit to make the column unsortable. */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
}

/**
 * Generic enterprise data table — sticky header, optional per-column
 * client-side sort, optional client-side pagination (only activates
 * when `pageSize` is passed), and the shared Loading/Error/Empty
 * states. `data: null` means "loading" (renders `Skeleton` rows
 * instead of a spinner, matching the dashboard's premium-loading
 * requirement); pass `[]` once loaded-but-empty.
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  error,
  onRetry,
  emptyMessage = 'Nothing to show yet.',
  pageSize,
}: {
  columns: DataTableColumn<T>[];
  data: T[] | null;
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  pageSize?: number;
}): JSX.Element {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!data) return [];
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortValue) return data;
    const withKeys = data.map((row) => ({ row, key: column.sortValue!(row) }));
    withKeys.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    if (sortDir === 'desc') withKeys.reverse();
    return withKeys.map((item) => item.row);
  }, [data, columns, sortKey, sortDir]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const pageItems = pageSize
    ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sorted;

  function toggleSort(column: DataTableColumn<T>): void {
    if (!column.sortValue) return;
    if (sortKey === column.key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(column.key);
      setSortDir('asc');
    }
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (data !== null && data.length === 0) {
    return <EmptyState icon="inbox" message={emptyMessage} />;
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={
                  column.align === 'right' ? styles.alignRight : column.align === 'center' ? styles.alignCenter : ''
                }
              >
                {column.sortValue ? (
                  <button type="button" className={styles.sortButton} onClick={() => toggleSort(column)}>
                    {column.header}
                    <Icon
                      name={sortKey === column.key && sortDir === 'desc' ? 'chevronDown' : 'chevronUp'}
                      size={12}
                      className={sortKey === column.key ? styles.sortIconActive : styles.sortIcon}
                    />
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data === null
            ? Array.from({ length: pageSize ?? 5 }).map((_, rowIndex) => (
                // eslint-disable-next-line react/no-array-index-key -- skeleton placeholder rows have no real identity
                <tr key={rowIndex}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      <Skeleton width="80%" />
                    </td>
                  ))}
                </tr>
              ))
            : pageItems.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className={onRowClick ? styles.rowClickable : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={
                        column.align === 'right'
                          ? styles.alignRight
                          : column.align === 'center'
                            ? styles.alignCenter
                            : ''
                      }
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>

      {pageSize && data !== null && data.length > pageSize && (
        <div className={styles.pagination}>
          <span className={styles.paginationSummary}>
            {sorted.length} row{sorted.length === 1 ? '' : 's'} — page {currentPage} of {totalPages}
          </span>
          <div className={styles.paginationControls}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
