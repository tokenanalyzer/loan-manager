import type { LeadAssignmentHistoryEntry } from '@loan-manager/shared-types';
import { useEffect, useState } from 'react';

import { fetchAssignmentHistory } from './leads-api';
import { ModalOverlay } from './ModalOverlay';

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
    <ModalOverlay onClose={onClose}>
      <h2 style={{ marginTop: 0 }}>Assignment history</h2>
      {error && <p>{error}</p>}
      {!error && !history && <p>Loading…</p>}
      {history && history.length === 0 && <p>No assignment history yet.</p>}
      {history && history.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {history.map((entry) => (
            <li key={entry.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
              <div>
                <strong>{actionLabel(entry.action)}</strong> —{' '}
                {new Date(entry.createdAt).toLocaleString()}
              </div>
              <div>Assigned by: {entry.assignedByName ?? 'Unknown'}</div>
              <div>Previous employee: {entry.previousEmployeeName ?? 'Unassigned'}</div>
              <div>New employee: {entry.newEmployeeName ?? entry.newEmployeeId}</div>
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: '1rem', textAlign: 'right' }}>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </ModalOverlay>
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
