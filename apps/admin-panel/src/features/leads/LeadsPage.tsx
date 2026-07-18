import type { EmployeeWorkload, LeadSummary } from '@loan-manager/shared-types';
import { useCallback, useEffect, useState } from 'react';

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

type Tab = 'unassigned' | 'assigned';

type PendingAction =
  | { kind: 'assign'; leadId: string }
  | { kind: 'bulk-transfer' }
  | { kind: 'transfer-all'; fromEmployeeId: string };

/**
 * The CRM/Super Admin Lead Assignment screen.
 *
 * Unassigned Leads is the primary requirement; the Assigned tab lets
 * the admin reassign an already-assigned lead or transfer a selected
 * batch. "Transfer all active leads" is a per-employee action in the
 * Employees & Workload panel below, since it operates on an employee,
 * not on a specific lead selection.
 */
export function LeadsPage(): JSX.Element {
  const [tab, setTab] = useState<Tab>('unassigned');
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeWorkload[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<PendingAction | null>(null);
  const [historyForLeadId, setHistoryForLeadId] = useState<string | null>(null);

  const loadLeads = useCallback(async (nextTab: Tab) => {
    setLoading(true);
    setError(null);
    try {
      if (nextTab === 'unassigned') {
        setLeads(await fetchUnassignedLeads());
      } else {
        const all = await fetchAllLeads();
        setLeads(all.filter((lead) => lead.assignedToId !== null));
      }
      setSelectedIds(new Set());
    } catch {
      setError('Could not load leads.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      setEmployees(await fetchEmployeesWithWorkload());
    } catch {
      setError('Could not load employees.');
    }
  }, []);

  useEffect(() => {
    void loadLeads(tab);
  }, [tab, loadLeads]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleEmployeeSelected(employeeId: string) {
    if (!action) return;
    setBusy(true);
    setError(null);
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
      setError('That action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 1100 }}>
      <h1>Lead Assignment</h1>

      <div style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => setTab('unassigned')}
          style={{ fontWeight: tab === 'unassigned' ? 'bold' : 'normal', marginRight: 8 }}
        >
          Unassigned Leads
        </button>
        <button
          type="button"
          onClick={() => setTab('assigned')}
          style={{ fontWeight: tab === 'assigned' ? 'bold' : 'normal' }}
        >
          Assigned Leads
        </button>
      </div>

      {error && <p style={{ color: '#c62828' }}>{error}</p>}

      {selectedIds.size > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <button type="button" onClick={() => setAction({ kind: 'bulk-transfer' })}>
            Transfer selected ({selectedIds.size})
          </button>
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : leads.length === 0 ? (
        <p>{tab === 'unassigned' ? 'No unassigned leads.' : 'No assigned leads.'}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th style={cellStyle} />
              <th style={cellStyle}>Applicant</th>
              <th style={cellStyle}>Amount</th>
              <th style={cellStyle}>Term</th>
              <th style={cellStyle}>Status</th>
              <th style={cellStyle}>Submitted</th>
              {tab === 'assigned' && <th style={cellStyle}>Assigned To</th>}
              <th style={cellStyle} />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={cellStyle}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lead.id)}
                    onChange={() => toggleSelected(lead.id)}
                  />
                </td>
                <td style={cellStyle}>{lead.applicantName ?? lead.applicantId.slice(0, 8)}</td>
                <td style={cellStyle}>{lead.requestedAmount}</td>
                <td style={cellStyle}>{lead.requestedTermMonths} mo</td>
                <td style={cellStyle}>{lead.status}</td>
                <td style={cellStyle}>{new Date(lead.submittedAt).toLocaleDateString()}</td>
                {tab === 'assigned' && <td style={cellStyle}>{lead.assignedToName ?? '—'}</td>}
                <td style={cellStyle}>
                  <button
                    type="button"
                    onClick={() => setAction({ kind: 'assign', leadId: lead.id })}
                  >
                    {tab === 'unassigned' ? 'Assign' : 'Reassign'}
                  </button>{' '}
                  <button type="button" onClick={() => setHistoryForLeadId(lead.id)}>
                    History
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ marginTop: '2rem' }}>Employees &amp; workload</h2>
      <EmployeeWorkloadTable
        employees={employees}
        action={{
          mode: 'transferAll',
          onTransferAll: (fromEmployeeId) => setAction({ kind: 'transfer-all', fromEmployeeId }),
        }}
      />

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
    </main>
  );
}

const cellStyle = { padding: '6px 8px' };
