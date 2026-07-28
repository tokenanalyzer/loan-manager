import type { EmployeeWorkload } from '@loan-manager/shared-types';

import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { FormActions } from '../../components/ui/FormLayout';
import { Modal } from '../../components/ui/Modal';

import { EmployeeWorkloadTable } from './EmployeeWorkloadTable';

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
    <Modal title={title} onClose={onClose}>
      {busy ? (
        <LoadingState message="Working…" />
      ) : (
        <EmployeeWorkloadTable
          employees={employees}
          action={{ mode: 'select', label: confirmLabel, onSelect, excludeId }}
        />
      )}
      <FormActions>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
      </FormActions>
    </Modal>
  );
}
