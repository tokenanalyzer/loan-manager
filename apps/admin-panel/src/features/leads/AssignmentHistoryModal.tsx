import type { LeadAssignmentHistoryEntry } from '@loan-manager/shared-types';
import { useEffect, useState } from 'react';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { FormActions } from '../../components/ui/FormLayout';
import { Modal } from '../../components/ui/Modal';

import styles from './AssignmentHistoryModal.module.css';
import { fetchAssignmentHistory } from './leads-api';

/** Requirement 7: complete assignment history for a single lead. */
export function AssignmentHistoryModal({
  applicationId,
  onClose,
}: {
  applicationId: string;
  onClose: () => void;
}): JSX.Element {
  const [history, setHistory] = useState<LeadAssignmentHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAssignmentHistory(applicationId)
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load assignment history.');
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  return (
    <Modal title="Assignment history" onClose={onClose}>
      {error && <ErrorState message={error} />}
      {!error && !history && <LoadingState message="Loading assignment history…" />}
      {!error && history && history.length === 0 && (
        <EmptyState message="No assignment history yet." />
      )}
      {!error && history && history.length > 0 && (
        <ul className={styles.list}>
          {history.map((entry) => (
            <li key={entry.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <strong>{actionLabel(entry.action)}</strong>
                <span className={styles.itemDate}>{new Date(entry.createdAt).toLocaleString()}</span>
              </div>
              <div className={styles.itemDetail}>Assigned by: {entry.assignedByName ?? 'Unknown'}</div>
              <div className={styles.itemDetail}>Previous employee: {entry.previousEmployeeName ?? 'Unassigned'}</div>
              <div className={styles.itemDetail}>New employee: {entry.newEmployeeName ?? entry.newEmployeeId}</div>
            </li>
          ))}
        </ul>
      )}
      <FormActions>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </FormActions>
    </Modal>
  );
}

function actionLabel(action: LeadAssignmentHistoryEntry['action']): string {
  switch (action) {
    case 'assign':
      return 'Assigned';
    case 'reassign':
      return 'Reassigned';
    case 'transfer':
      return 'Transferred';
    default:
      return action;
  }
}
