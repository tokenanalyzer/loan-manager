import type { EmployeeWorkload, LeadSummary } from '@loan-manager/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { PageContainer } from '../../components/ui/PageContainer';
import { TableContainer } from '../../components/ui/TableContainer';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '../workspace/lead-status-meta';

import { AssignmentHistoryModal } from './AssignmentHistoryModal';
import { EmployeePickerModal } from './EmployeePickerModal';
import { EmployeeWorkloadTable } from './EmployeeWorkloadTable';
import {
  assignLead,
  fetchAllLeads,
  fetchEmployeesWithWorkload,
  fetchUnassignedLeads,
  transferAllActiveLeads,
  transferSelectedLeads,
} from './leads-api';
import styles from './LeadsPage.module.css';

type Tab = 'unassigned' | 'assigned';

type PendingAction =
  | { kind: 'assign'; leadId: string }
  | { kind: 'bulk-transfer' }
  | { kind: 'transfer-all'; fromEmployeeId: string };

/**
 * The CRM/Super Admin Lead Assignment screen.
 *
 * Unassigned Leads is the primary requirement — a searchable/filterable
 * queue an admin works through to assign every incoming lead to an
 * employee. The Assigned tab reuses the same list/assign machinery to
 * let the admin reassign an already-assigned lead or transfer a
 * selected batch. "Transfer all active leads" is a per-employee action
 * in the Employees & Workload panel below, since it operates on an
 * employee, not on a specific lead selection.
 */
export function LeadsPage(): JSX.Element {
  const [tab, setTab] = useState<Tab>('unassigned');
  const [leads, setLeads] = useState<LeadSummary[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeWorkload[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<PendingAction | null>(null);
  const [historyForLeadId, setHistoryForLeadId] = useState<string | null>(null);

  const loadLeads = useCallback(async (nextTab: Tab) => {
    setLeads(null);
    setLeadsError(null);
    try {
      if (nextTab === 'unassigned') {
        setLeads(await fetchUnassignedLeads());
      } else {
        const all = await fetchAllLeads();
        setLeads(all.filter((lead) => lead.assignedToId !== null));
      }
      setSelectedIds(new Set());
    } catch {
      setLeadsError(
        nextTab === 'unassigned'
          ? 'Could not load unassigned leads.'
          : 'Could not load assigned leads.',
      );
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      setEmployees(await fetchEmployeesWithWorkload());
      setEmployeesError(null);
    } catch {
      setEmployeesError('Could not load employees.');
    }
  }, []);

  useEffect(() => {
    void loadLeads(tab);
  }, [tab, loadLeads]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  function switchTab(nextTab: Tab): void {
    setTab(nextTab);
    setQuery('');
    setCategoryFilter('all');
  }

  function refresh(): void {
    void Promise.all([loadLeads(tab), loadEmployees()]);
  }

  const categories = useMemo(() => {
    if (!leads) return [];
    return Array.from(
      new Set(leads.map((lead) => lead.categoryId).filter((id): id is string => Boolean(id))),
    ).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    if (!leads) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (categoryFilter !== 'all' && lead.categoryId !== categoryFilter) return false;
      if (!normalizedQuery) return true;
      const haystack = [lead.applicantName, lead.purpose, lead.categoryId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [leads, query, categoryFilter]);

  function toggleSelected(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleEmployeeSelected(employeeId: string): Promise<void> {
    if (!action) return;
    setBusy(true);
    setActionError(null);
    try {
      if (action.kind === 'assign') {
        await assignLead(action.leadId, employeeId);
      } else if (action.kind === 'bulk-transfer') {
        await transferSelectedLeads(Array.from(selectedIds), employeeId);
      } else if (action.kind === 'transfer-all') {
        await transferAllActiveLeads(action.fromEmployeeId, employeeId);
      }
      setAction(null);
      await Promise.all([loadLeads(tab), loadEmployees()]);
    } catch {
      setActionError('That action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer
      title="Lead Assignment"
      description="Assign unassigned leads to an employee, or reassign/transfer existing ones."
      actions={
        <Button variant="secondary" size="sm" onClick={refresh}>
          <Icon name="refresh" size={16} />
          Refresh
        </Button>
      }
    >
      <div className={styles.tabs}>
        <Button
          variant={tab === 'unassigned' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => switchTab('unassigned')}
        >
          Unassigned Leads
        </Button>
        <Button
          variant={tab === 'assigned' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => switchTab('assigned')}
        >
          Assigned Leads
        </Button>
      </div>

      {actionError && <ErrorState message={actionError} onRetry={() => setActionError(null)} />}

      {leadsError && <ErrorState message={leadsError} onRetry={refresh} />}

      {!leadsError && leads === null && <LoadingState message="Loading leads…" />}

      {!leadsError && leads !== null && (
        <>
          <div className={styles.toolbar}>
            <input
              className={styles.search}
              type="search"
              placeholder="Search by applicant, purpose, or category…"
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
          </div>

          {selectedIds.size > 0 && (
            <div className={styles.bulkBar}>
              <Button size="sm" onClick={() => setAction({ kind: 'bulk-transfer' })}>
                Transfer selected ({selectedIds.size})
              </Button>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              message={
                leads.length === 0
                  ? tab === 'unassigned'
                    ? 'No unassigned leads right now — new submissions will appear here.'
                    : 'No assigned leads yet.'
                  : 'No leads match your search/filter.'
              }
            />
          ) : (
            <TableContainer>
              <thead>
                <tr>
                  <th />
                  <th>Applicant</th>
                  <th>Amount</th>
                  <th>Term</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  {tab === 'assigned' && <th>Assigned To</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelected(lead.id)}
                        aria-label={`Select ${lead.applicantName ?? lead.applicantId}`}
                      />
                    </td>
                    <td>{lead.applicantName ?? lead.applicantId.slice(0, 8)}</td>
                    <td>{lead.requestedAmount}</td>
                    <td>{lead.requestedTermMonths} mo</td>
                    <td>{lead.categoryId ?? '—'}</td>
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
                    {tab === 'assigned' && <td>{lead.assignedToName ?? '—'}</td>}
                    <td>
                      <div className={styles.rowActions}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setAction({ kind: 'assign', leadId: lead.id })}
                        >
                          {tab === 'unassigned' ? 'Assign' : 'Reassign'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoryForLeadId(lead.id)}
                        >
                          History
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableContainer>
          )}
        </>
      )}

      <div>
        <h2 className={styles.sectionTitle}>Employees &amp; workload</h2>
        {employeesError ? (
          <ErrorState message={employeesError} onRetry={() => void loadEmployees()} />
        ) : (
          <EmployeeWorkloadTable
            employees={employees}
            action={{
              mode: 'transferAll',
              onTransferAll: (fromEmployeeId) =>
                setAction({ kind: 'transfer-all', fromEmployeeId }),
            }}
          />
        )}
      </div>

      {action && (
        <EmployeePickerModal
          title={
            action.kind === 'assign'
              ? 'Assign lead to employee'
              : action.kind === 'bulk-transfer'
                ? `Transfer ${selectedIds.size} selected lead(s) to`
                : 'Transfer all active leads to'
          }
          confirmLabel={action.kind === 'assign' ? 'Assign' : 'Transfer'}
          employees={employees}
          excludeId={action.kind === 'transfer-all' ? action.fromEmployeeId : undefined}
          busy={busy}
          onSelect={(employeeId) => void handleEmployeeSelected(employeeId)}
          onClose={() => setAction(null)}
        />
      )}

      {historyForLeadId && (
        <AssignmentHistoryModal
          applicationId={historyForLeadId}
          onClose={() => setHistoryForLeadId(null)}
        />
      )}
    </PageContainer>
  );
}
