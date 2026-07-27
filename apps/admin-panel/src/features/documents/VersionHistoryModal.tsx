import type { DocumentVersion } from '@loan-manager/shared-types';
import { useEffect, useState } from 'react';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Modal } from '../../components/ui/Modal';

import { fetchDocumentVersions, formatFileSize } from './documents-api';

const STATUS_LABEL: Record<DocumentVersion['verificationStatus'], string> = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
  reupload_requested: 'Re-upload Requested',
};

/**
 * Version History — every immutable upload for a document, newest
 * first (Document Versioning's data model has supported this since
 * the versioning fix; this is its first UI). Reused as-is by both the
 * Enterprise Document Center and Customer 360's embedded
 * `DocumentManagementCenter` — one modal, not duplicated per surface.
 */
export function VersionHistoryModal({
  documentId,
  fileName,
  onClose,
}: {
  documentId: string;
  fileName: string;
  onClose: () => void;
}): JSX.Element {
  const [versions, setVersions] = useState<DocumentVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDocumentVersions(documentId)
      .then((data) => {
        if (!cancelled) setVersions(data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load version history.');
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  return (
    <Modal title={`Version history — ${fileName}`} onClose={onClose}>
      {error && <ErrorState message={error} />}
      {!error && versions === null && <LoadingState message="Loading version history…" />}
      {!error && versions && versions.length === 0 && (
        <EmptyState message="No version history recorded for this document." />
      )}
      {!error && versions && versions.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {versions.map((version) => (
            <li
              key={version.id}
              style={{ borderBottom: '1px solid var(--color-border)', padding: '8px 0' }}
            >
              <div style={{ fontWeight: 500 }}>
                Version {version.versionNumber}
                {version.supersededAt === null ? ' (current)' : ''}
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-body-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {version.originalFileName} · {formatFileSize(version.fileSizeBytes)} · uploaded by{' '}
                {version.uploadedByName ?? 'the customer'} ·{' '}
                {new Date(version.uploadedAt).toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-body-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {STATUS_LABEL[version.verificationStatus]}
                {version.verifiedByName ? ` by ${version.verifiedByName}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
