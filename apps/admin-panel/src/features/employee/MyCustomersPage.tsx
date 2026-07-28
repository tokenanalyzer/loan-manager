import type { CustomerSummary } from '@loan-manager/shared-types';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { PageContainer } from '../../components/ui/PageContainer';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableContainer } from '../../components/ui/TableContainer';
import { fetchCustomers } from '../customers/customers-api';

import styles from './MyCustomersPage.module.css';

const PAGE_SIZE = 10;

/**
 * My Customers — Employee CRM. `GET /v1/customers` (via the existing
 * `fetchCustomers()` wrapper, unchanged) is already scoped server-side
 * to the caller's assigned customers for an `EMPLOYEE` role (sub-phase
 * 0's `CustomersService.listCustomers` change) — this page just lists
 * and links into the already-fully-built `CustomerDetailPage` at
 * `/employee/my-customers/:id`. Same fetch-once/filter-client-side
 * shape as `MyLeadsPage`, for the same reason: one employee's customer
 * count doesn't warrant server-side paging.
 */
export function MyCustomersPage(): JSX.Element {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  async function load(): Promise<void> {
    try {
      setCustomers(await fetchCustomers());
      setError(null);
    } catch {
      setError('Could not load your customers.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!customers) return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return customers;

    return customers.filter((customer) => {
      const haystack = [customer.fullName, customer.email, customer.phone].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [customers, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleQueryChange(value: string): void {
    setQuery(value);
    setPage(1);
  }

  return (
    <PageContainer title="My Customers" description="Customers you have an active application with.">
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!error && customers === null && <LoadingState message="Loading your customers…" />}

      {!error && customers && (
        <>
          <div className={styles.toolbar}>
            <input
              className={styles.search}
              type="search"
              placeholder="Search by name, email, or phone…"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              message={
                customers.length === 0
                  ? 'You have no assigned customers yet.'
                  : 'No customers match your search.'
              }
            />
          ) : (
            <>
              <TableContainer>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((customer) => (
                    <tr
                      key={customer.id}
                      className={styles.row}
                      onClick={() => navigate(`/employee/my-customers/${customer.id}`)}
                    >
                      <td>{customer.fullName ?? customer.id.slice(0, 8)}</td>
                      <td>{customer.email ?? '—'}</td>
                      <td>{customer.phone ?? '—'}</td>
                      <td>
                        <StatusBadge
                          label={customer.isActive ? 'Active' : 'Inactive'}
                          color={customer.isActive ? 'var(--color-success)' : 'var(--color-text-tertiary)'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableContainer>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <span>
                    Page {currentPage} of {totalPages} ({filtered.length} customers)
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </PageContainer>
  );
}
