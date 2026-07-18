import type { EmployeeStatusSummary } from '@loan-manager/shared-types';
import { useCallback, useEffect, useState } from 'react';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageContainer } from '../../components/ui/PageContainer';
import { TableContainer } from '../../components/ui/TableContainer';

import { formatElapsed, STATUS_COLORS, STATUS_LABELS } from './status-meta';
import {
  adminEndBreak,
  disableEmployee,
  fetchEmployeeStatuses,
  forceLogoutEmployee,
} from './work-status-api';

type PendingAction =
  | { kind: 'resume'; employeeId: string; name: string }
  | { kind: 'force-logout'; employeeId: string; name: string }
  | { kind: 'disable'; employeeId: string; name: string };

const REFRESH_INTERVAL_MS = 15_000;

/**
 * Admin Override — the Admin Portal's live view of every employee's
 * work status, with Resume (Force Resume) / Force Logout / Disable
 * actions. Polls on an interval so elapsed time and status changes
 * (an employee starting/ending their own break) stay current without
 * a manual refresh.
 */
export function EmployeeStatusPage(): JSX.Element {
  const [employees, setEmployees] = useState<EmployeeStatusSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setEmployees(await fetchEmployeeStatuses());
      setError(null);
    } catch {
      setError('Could not load employee statuses.');
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  async function handleConfirm(): Promise<void> {
    if (!action) return;
    setBusy(true);
    try {
      if (action.kind === 'resume') {
        await adminEndBreak(action.employeeId, true);
      } else if (action.kind === 'force-logout') {
        await forceLogoutEmployee(action.employeeId);
      } else {
        await disableEmployee(action.employeeId);
      }
      setAction(null);
      await load();
    } catch {
      setError('That action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer
      title="Employee Status"
      description="Live work status and break management."
      actions={
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      }
    >
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!error && employees === null && <LoadingState message="Loading employee statuses…" />}

      {!error && employees && employees.length === 0 && (
        <EmptyState message="No employees found." />
      )}

      {!error && employees && employees.length > 0 && (
        <TableContainer>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee ID</th>
              <th>Status</th>
              <th>Since</th>
              <th>Elapsed</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  {employee.fullName ?? '(no name)'}
                  {!employee.isActive && ' (Disabled)'}
                </td>
                <td>{employee.employeeCode ?? employee.id.slice(0, 8)}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: STATUS_COLORS[employee.status],
                      }}
                    />
                    {STATUS_LABELS[employee.status]}
                  </span>
                </td>
                <td>{new Date(employee.statusSince).toLocaleTimeString()}</td>
                <td>{formatElapsed(employee.elapsedSeconds)}</td>
                <td>
                  {employee.isOnBreak && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setAction({
                          kind: 'resume',
                          employeeId: employee.id,
                          name: employee.fullName ?? 'this employee',
                        })
                      }
                    >
                      Resume
                    </Button>
                  )}{' '}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setAction({
                        kind: 'force-logout',
                        employeeId: employee.id,
                        name: employee.fullName ?? 'this employee',
                      })
                    }
                  >
                    Force Logout
                  </Button>{' '}
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={!employee.isActive}
                    onClick={() =>
                      setAction({
                        kind: 'disable',
                        employeeId: employee.id,
                        name: employee.fullName ?? 'this employee',
                      })
                    }
                  >
                    Disable
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableContainer>
      )}

      {action && (
        <ConfirmDialog
          title={
            action.kind === 'resume'
              ? 'Force resume employee'
              : action.kind === 'force-logout'
                ? 'Force logout employee'
                : 'Disable employee'
          }
          message={
            action.kind === 'resume'
              ? `End ${action.name}'s break immediately and notify them?`
              : action.kind === 'force-logout'
                ? `Sign ${action.name} out of all active sessions immediately?`
                : `Disable ${action.name}'s account and sign them out immediately?`
          }
          confirmLabel={
            action.kind === 'resume'
              ? 'Force Resume'
              : action.kind === 'force-logout'
                ? 'Force Logout'
                : 'Disable'
          }
          variant={action.kind === 'disable' ? 'danger' : 'primary'}
          busy={busy}
          onConfirm={() => void handleConfirm()}
          onCancel={() => setAction(null)}
        />
      )}
    </PageContainer>
  );
}
