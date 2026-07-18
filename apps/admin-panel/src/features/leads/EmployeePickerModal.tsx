import type { EmployeeWorkload } from '@loan-manager/shared-types';

import { EmployeeWorkloadTable } from './EmployeeWorkloadTable';
import { ModalOverlay } from './ModalOverlay';

/**
 * Modal shown before every assign/reassign/transfer action — shows
 * each employee's identity, live presence, and workload so the admin
 * can make an informed choice, per the Lead Assignment spec.
 */
export function EmployeePickerModal({
  title,
  employees,
  confirmLabel,
  excludeId,
  busy,
  onSelect,
  onClose,
}: {
  title: string;
  employees: EmployeeWorkload[];
  confirmLabel: string;
  excludeId?: string;
  busy: boolean;
  onSelect: (employeeId: string) => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <ModalOverlay onClose={onClose}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {busy ? (
        <p>Working…</p>
      ) : (
        <EmployeeWorkloadTable
          employees={employees}
          action={{ mode: 'select', label: confirmLabel, onSelect, excludeId }}
        />
      )}
      <div style={{ marginTop: '1rem', textAlign: 'right' }}>
        <button type="button" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
    </ModalOverlay>
  );
}
