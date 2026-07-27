import type { EmployeeWorkload, LeadSummary, LoanApplicationStatus } from '@loan-manager/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorState } from '../../components/states/ErrorState';
import { Button } from '../../components/ui/Button';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { Icon } from '../../components/ui/Icon';
import { PageContainer } from '../../components/ui/PageContainer';
import { formatInr } from '../../lib/currency';
import { AssignmentHistoryModal } from '../leads/AssignmentHistoryModal';
import { EmployeePickerModal } from '../leads/EmployeePickerModal';
import { assignLead, fetchAllLeads, fetchEmployeesWithWorkload, transferSelectedLeads } from '../leads/leads-api';
import { formatDateTime, getDisplayStatus, LEAD_STATUS_LABELS } from '../workspace/lead-status-meta';

import { exportApplicationsCsv } from './applications-csv';
import { matchesQuery } from './applications-search';
import styles from './ApplicationsPage.module.css';
import { deleteSavedView, loadSavedViews, saveSavedView, type ApplicationsFilterState, type SavedView } from './saved-views';

const ALL_STATUSES = Object.keys(LEAD_STATUS_LABELS) as LoanApplicationStatus[];

const EMPTY_FILTERS: ApplicationsFilterState = {
  query: '',
  statuses: [],
  categoryFilter: 'all',
  assignmentFilter: 'all',
  dateFrom: '',
  dateTo: '',
};

type PendingAction = { kind: 'assign'; leadId: string } | { kind: 'bulk-transfer' };

/**
 * Applications — the master case list across every status (unlike
 * `LeadsPage`'s unassigned/assigned assignment-queue tabs). Client-side
 * search/filter/sort/pagination over `fetchAllLeads()`, same data
 * volume precedent as the Dashboard and `LeadsPage`. Every row opens
 * the existing `LeadDetailPage` at `/applications/:id`.
 */
export function ApplicationsPage(): JSX.Element {
  const navigate = useNavigate();

  const [leads, setLeads] = useState<LeadSummary[] | null>(null);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeWorkload[]>([]);

  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState<Set<LoanApplicationStatus>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyForLeadId, setHistoryForLeadId] = useState<string | null>(null);

  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [newViewName, setNewViewName] = useState('');
  const [selectedViewName, setSelectedViewName] = useState('');

  const loadLeads = useCallback(async () => {
    setLeadsError(null);
    try {
      setLeads(await fetchAllLeads());
    } catch {
      setLeadsError('Could not load applications.');
    }
  }, []);

  useEffect(() => {
    void loadLeads();
    void fetchEmployeesWithWorkload().then(setEmployees, () => undefined);
    setSavedViews(loadSavedViews());
  }, [loadLeads]);

  const categories = useMemo(() => {
    if (!leads) return [];
    return Array.from(
      new Set(leads.map((lead) => lead.categoryId).filter((id): id is string => Boolean(id))),
    ).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    if (!leads) return [];
    return leads.filter((lead) => {
      if (statuses.size > 0 && !statuses.has(lead.status)) return false;
      if (categoryFilter !== 'all' && lead.categoryId !== categoryFilter) return false;
      if (assignmentFilter === 'assigned' && !lead.assignedToId) return false;
      if (assignmentFilter === 'unassigned' && lead.assignedToId) return false;
      if (dateFrom && new Date(lead.submittedAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(lead.submittedAt) > new Date(`${dateTo}T23:59:59`)) return false;
      return matchesQuery(lead, query);
    });
  }, [leads, statuses, categoryFilter, assignmentFilter, dateFrom, dateTo, query]);

  function toggleStatus(status: LoanApplicationStatus): void {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function toggleSelected(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyFilters(filters: ApplicationsFilterState): void {
    setQuery(filters.query);
    setStatuses(new Set(filters.statuses));
    setCategoryFilter(filters.categoryFilter);
    setAssignmentFilter(filters.assignmentFilter);
    setDateFrom(filters.dateFrom);
    setDateTo(filters.dateTo);
  }

  function handleSaveView(): void {
    const name = newViewName.trim();
    if (!name) return;
    const filters: ApplicationsFilterState = {
      query,
      statuses: Array.from(statuses),
      categoryFilter,
      assignmentFilter,
      dateFrom,
      dateTo,
    };
    setSavedViews(saveSavedView({ name, filters }));
    setSelectedViewName(name);
    setNewViewName('');
  }

  async function handleEmployeeSelected(employeeId: string): Promise<void> {
    if (!action) return;
    setBusy(true);
    setActionError(null);
    try {
      if (action.kind === 'assign') {
        await assignLead(action.leadId, employeeId);
      } else {
        await transferSelectedLeads(Array.from(selectedIds), employeeId);
        setSelectedIds(new Set());
      }
      setAction(null);
      await loadLeads();
    } catch {
      setActionError('That action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const columns: DataTableColumn<LeadSummary>[] = [
    {
      key: 'select',
      header: '',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelected(row.id)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Select ${row.applicantName ?? row.caseNumber}`}
        />
      ),
    },
    { key: 'caseNumber', header: 'Case Number', sortValue: (row) => row.caseNumber, render: (row) => row.caseNumber },
    {
      key: 'applicant',
      header: 'Applicant',
      sortValue: (row) => row.applicantName ?? '',
      render: (row) => row.applicantName ?? row.applicantId.slice(0, 8),
    },
    { key: 'category', header: 'Category', render: (row) => row.categoryId ?? '—' },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortValue: (row) => Number(row.requestedAmount),
      render: (row) => formatInr(row.requestedAmount),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const { label, color } = getDisplayStatus(row);
        return (
          <span className={styles.statusBadge}>
            <span className={styles.statusDot} style={{ background: color }} />
            {label}
          </span>
        );
      },
    },
    { key: 'assignedTo', header: 'Assigned To', render: (row) => row.assignedToName ?? 'Unassigned' },
    {
      key: 'submitted',
      header: 'Submitted',
      sortValue: (row) => new Date(row.submittedAt).getTime(),
      render: (row) => formatDateTime(row.submittedAt),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className={styles.rowActions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setAction({ kind: 'assign', leadId: row.id });
            }}
          >
            {row.assignedToId ? 'Reassign' : 'Assign'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setHistoryForLeadId(row.id);
            }}
          >
            History
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Applications"
      description="Every loan application across every status — search, filter, and act from one place."
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => void loadLeads()}>
            <Icon name="refresh" size={16} />
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportApplicationsCsv(filtered)}
            disabled={filtered.length === 0}
          >
            Export CSV
          </Button>
        </>
      }
    >
      {leadsError && <ErrorState message={leadsError} onRetry={() => void loadLeads()} />}
      {actionError && <ErrorState message={actionError} onRetry={() => setActionError(null)} />}

      {!leadsError && (
        <>
          <div className={styles.toolbar}>
            <input
              className={styles.search}
              type="search"
              placeholder="Search by case number, applicant, purpose, or category…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className={styles.select}
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((categoryId) => (
                <option key={categoryId} value={categoryId}>
                  {categoryId}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              value={assignmentFilter}
              onChange={(event) => setAssignmentFilter(event.target.value as typeof assignmentFilter)}
            >
              <option value="all">Assigned + unassigned</option>
              <option value="assigned">Assigned only</option>
              <option value="unassigned">Unassigned only</option>
            </select>
            <input
              className={styles.select}
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              aria-label="Submitted from"
            />
            <input
              className={styles.select}
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              aria-label="Submitted to"
            />
          </div>

          <div className={styles.statusChips}>
            {ALL_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={statuses.has(status) ? styles.chipActive : styles.chip}
                onClick={() => toggleStatus(status)}
              >
                {LEAD_STATUS_LABELS[status]}
              </button>
            ))}
            {statuses.size > 0 && (
              <button type="button" className={styles.chip} onClick={() => setStatuses(new Set())}>
                Clear
              </button>
            )}
          </div>

          <div className={styles.savedViewsBar}>
            <select
              className={styles.select}
              value={selectedViewName}
              onChange={(event) => {
                const name = event.target.value;
                setSelectedViewName(name);
                const view = savedViews.find((v) => v.name === name);
                if (view) applyFilters(view.filters);
              }}
            >
              <option value="">Load a saved view…</option>
              {savedViews.map((view) => (
                <option key={view.name} value={view.name}>
                  {view.name}
                </option>
              ))}
            </select>
            {selectedViewName && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSavedViews(deleteSavedView(selectedViewName));
                  setSelectedViewName('');
                }}
              >
                Delete view
              </Button>
            )}
            <input
              className={styles.search}
              placeholder="Name this view…"
              value={newViewName}
              onChange={(event) => setNewViewName(event.target.value)}
            />
            <Button variant="secondary" size="sm" onClick={handleSaveView} disabled={!newViewName.trim()}>
              Save view
            </Button>
            {savedViews.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedViewName('');
                  applyFilters(EMPTY_FILTERS);
                }}
              >
                Reset filters
              </Button>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className={styles.bulkBar}>
              <Button size="sm" onClick={() => setAction({ kind: 'bulk-transfer' })}>
                Assign/transfer selected ({selectedIds.size})
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear selection
              </Button>
            </div>
          )}

          <DataTable
            columns={columns}
            data={leads === null ? null : filtered}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => navigate(`/applications/${row.id}`, { state: { from: '/applications' } })}
            emptyMessage="No applications match your filters."
            pageSize={20}
          />
        </>
      )}

      {action && (
        <EmployeePickerModal
          title={action.kind === 'assign' ? 'Assign application to employee' : `Transfer ${selectedIds.size} selected application(s) to`}
          confirmLabel={action.kind === 'assign' ? 'Assign' : 'Transfer'}
          employees={employees}
          busy={busy}
          onSelect={(employeeId) => void handleEmployeeSelected(employeeId)}
          onClose={() => setAction(null)}
        />
      )}

      {historyForLeadId && (
        <AssignmentHistoryModal applicationId={historyForLeadId} onClose={() => setHistoryForLeadId(null)} />
      )}
    </PageContainer>
  );
}
