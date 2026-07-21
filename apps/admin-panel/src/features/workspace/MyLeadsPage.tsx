import type { LeadSummary, LoanApplicationStatus } from '@loan-manager/shared-types';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { PageContainer } from '../../components/ui/PageContainer';
import { TableContainer } from '../../components/ui/TableContainer';

import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from './lead-status-meta';
import styles from './MyLeadsPage.module.css';
import { fetchMyLeads } from './workspace-api';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | LoanApplicationStatus;

/**
 * My Assigned Leads — the Employee Workspace's Lead List. The backend
 * already scopes `GET /loan-applications` to the caller's own
 * assigned leads for an EMPLOYEE, so this fetches once and does
 * search/filter/pagination client-side (a single employee's lead
 * count doesn't warrant server-side paging).
 */
export function MyLeadsPage(): JSX.Element {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  async function load(): Promise<void> {
    try {
      setLeads(await fetchMyLeads());
      setError(null);
    } catch {
      setError('Could not load your assigned leads.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!leads) return [];
    const normalizedQuery = query.trim().toLowerCase();

    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      const haystack = [lead.applicantName, lead.purpose, lead.categoryId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [leads, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleQueryChange(value: string): void {
    setQuery(value);
    setPage(1);
  }

  function handleStatusChange(value: StatusFilter): void {
    setStatusFilter(value);
    setPage(1);
  }

  return (
    <PageContainer title="My Assigned Leads" description="Leads currently assigned to you.">
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!error && leads === null && <LoadingState message="Loading your leads…" />}

      {!error && leads && (
        <>
          <div className={styles.toolbar}>
            <input
              className={styles.search}
              type="search"
              placeholder="Search by customer, purpose, or category…"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
            />
            <select
              className={styles.select}
              value={statusFilter}
              onChange={(event) => handleStatusChange(event.target.value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              {(Object.keys(LEAD_STATUS_LABELS) as LoanApplicationStatus[]).map((status) => (
                <option key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              message={
                leads.length === 0
                  ? 'You have no assigned leads yet.'
                  : 'No leads match your search/filter.'
              }
            />
          ) : (
            <>
              <TableContainer>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Term</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((lead) => (
                    <tr
                      key={lead.id}
                      className={styles.row}
                      onClick={() => navigate(`/my-leads/${lead.id}`)}
                    >
                      <td>{lead.applicantName ?? lead.applicantId.slice(0, 8)}</td>
                      <td>{lead.requestedAmount}</td>
                      <td>{lead.requestedTermMonths} mo</td>
                      <td>
                        <span className={styles.statusBadge}>
                          <span
                            className={styles.dot}
                            style={{ background: LEAD_STATUS_COLORS[lead.status] }}
                          />
                          {LEAD_STATUS_LABELS[lead.status]}
                        </span>
                      </td>
                      <td>{new Date(lead.submittedAt).toLocaleDateString()}</td>
                      <td>
                        {lead.assignedAt ? new Date(lead.assignedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableContainer>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <span>
                    Page {currentPage} of {totalPages} ({filtered.length} leads)
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
