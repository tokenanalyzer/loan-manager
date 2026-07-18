import type { DocumentAuditEntry } from '@loan-manager/shared-types';
import { useEffect, useState } from 'react';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Modal } from '../../components/ui/Modal';

import { fetchDocumentAudit } from './documents-api';

const ACTION_LABELS: Record<string, string> = {
  document_downloaded: 'Downloaded/previewed',
  document_verification_updated: 'Verification updated',
};

/** Download Audit — every recorded access/verification event for a document. */
export function DocumentAuditModal({
  documentId,
  fileName,
  onClose,
}: {
  documentId: string;
  fileName: string;
  onClose: () => void;
}): JSX.Element {
  const [entries, setEntries] = useState<DocumentAuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDocumentAudit(documentId)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the audit trail.');
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  return (
    <Modal title={`Audit trail — ${fileName}`} onClose={onClose}>
      {error && <ErrorState message={error} />}
      {!error && entries === null && <LoadingState message="Loading audit trail…" />}
      {!error && entries && entries.length === 0 && (
        <EmptyState message="No access has been recorded for this document yet." />
      )}
      {!error && entries && entries.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {entries.map((entry) => (
            <li key={entry.id} style={{ borderBottom: '1px solid var(--color-border)', padding: '8px 0' }}>
              <div style={{ fontWeight: 500 }}>{ACTION_LABELS[entry.action] ?? entry.action}</div>
              <div style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--color-text-secondary)' }}>
                By {entry.actorName ?? 'an unknown user'} · {new Date(entry.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
