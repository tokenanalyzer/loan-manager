import type { EmployeeWorkload } from '@loan-manager/shared-types';
import type { CSSProperties } from 'react';

/**
 * Requirement: before assigning a lead, the admin must see the
 * employee's name, ID, live Online/Offline status, active leads
 * count, pending leads count, and today's workload. Reused as a
 * standalone panel, inside `EmployeePickerModal`, and (read-only,
 * `action` omitted) as the Admin Dashboard's Employee Workload
 * Summary.
 */
export function EmployeeWorkloadTable({
  employees,
  action,
}: {
  employees: EmployeeWorkload[];
  action?:
    | { mode: 'select'; label: string; onSelect: (employeeId: string) => void; excludeId?: string }
    | { mode: 'transferAll'; onTransferAll: (employeeId: string) => void };
}): JSX.Element {
  if (employees.length === 0) {
    return <p>No employees found.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
          <th style={cellStyle}>Employee</th>
          <th style={cellStyle}>Employee ID</th>
          <th style={cellStyle}>Status</th>
          <th style={cellStyle}>Active</th>
          <th style={cellStyle}>Pending</th>
          <th style={cellStyle}>Today</th>
          {action && <th style={cellStyle} />}
        </tr>
      </thead>
      <tbody>
        {employees.map((employee) => {
          const excluded = action?.mode === 'select' && action.excludeId === employee.id;
          return (
            <tr key={employee.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={cellStyle}>{employee.fullName ?? '(no name)'}</td>
              <td style={cellStyle}>{employee.employeeCode ?? employee.id.slice(0, 8)}</td>
              <td style={cellStyle}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    marginRight: 6,
                    background: employee.isOnline ? '#2e7d32' : '#9e9e9e',
                  }}
                />
                {employee.isOnline ? 'Online' : 'Offline'}
              </td>
              <td style={cellStyle}>{employee.activeLeadsCount}</td>
              <td style={cellStyle}>{employee.pendingLeadsCount}</td>
              <td style={cellStyle}>{employee.todaysWorkload}</td>
              {action && (
                <td style={cellStyle}>
                  {action.mode === 'select' && (
                    <button
                      type="button"
                      disabled={excluded}
                      onClick={() => action.onSelect(employee.id)}
                    >
                      {action.label}
                    </button>
                  )}
                  {action.mode === 'transferAll' && (
                    <button
                      type="button"
                      disabled={employee.activeLeadsCount === 0}
                      onClick={() => action.onTransferAll(employee.id)}
                    >
                      Transfer all active leads
                    </button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const cellStyle: CSSProperties = { padding: '6px 8px' };
