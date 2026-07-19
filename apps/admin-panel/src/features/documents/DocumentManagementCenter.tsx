import type { DocumentVerificationStatus, DocumentsOverview } from '@loan-manager/shared-types';
import { useEffect, useState } from 'react';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../core/auth-context';

import { DocumentAuditModal } from './DocumentAuditModal';
import styles from './DocumentManagementCenter.module.css';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import {
  fetchCustomerDocuments,
  fetchDocumentBlob,
  formatFileSize,
  triggerDownload,
  updateDocumentVerification,
} from './documents-api';
import { VerificationModal } from './VerificationModal';

interface FlatDocument {
  id: string;
  typeLabel: string;
  originalFileName: string;
  mimeType: string | null;
  fileSizeBytes: string | null;
  uploadedAt: string;
  verificationStatus: DocumentVerificationStatus;
  verificationNote: string | null;
  verifiedByName: string | null;
}

function flatten(overview: DocumentsOverview): FlatDocument[] {
  const documents: FlatDocument[] = [];
  for (const category of overview.categories) {
    for (const type of category.types) {
      for (const slot of type.slots) {
        if (slot.isUploaded && slot.document) {
          documents.push({
            id: slot.document.id,
            typeLabel: type.label,
            originalFileName: slot.document.originalFileName,
            mimeType: slot.document.mimeType,
            fileSizeBytes: slot.document.fileSizeBytes,
            uploadedAt: slot.document.uploadedAt,
            verificationStatus: slot.document.verificationStatus,
            verificationNote: slot.document.verificationNote,
            verifiedByName: slot.document.verifiedByName,
          });
        }
      }
    }
  }
  return documents;
}

const BADGE_CLASS: Record<DocumentVerificationStatus, string> = {
  pending: styles.badgePending,
  verified: styles.badgeVerified,
  rejected: styles.badgeRejected,
};

const BADGE_LABEL: Record<DocumentVerificationStatus, string> = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
};

/**
 * Document Management Center — Preview, Download, Verification
 * Status, Metadata, Secure Access, and Download Audit, all built on
 * the existing `documents` API and portal theme. Drop-in reusable:
 * pass a `customerId` and it works the same in the Employee Portal
 * (already wired into Lead Detail), a future CRM customer page, or a
 * Super Admin oversight page — nothing here is workspace-specific.
 */
export function DocumentManagementCenter({ customerId }: { customerId: string }): JSX.Element {
  const { profile } = useAuth();
  const canVerify = profile?.role === 'employee' || profile?.role === 'admin';

  const [documents, setDocuments] = useState<FlatDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<FlatDocument | null>(null);
  const [verifying, setVerifying] = useState<FlatDocument | null>(null);
  const [viewingAudit, setViewingAudit] = useState<FlatDocument | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function load(): Promise<void> {
    try {
      const overview = await fetchCustomerDocuments(customerId);
      setDocuments(flatten(overview));
      setError(null);
    } catch {
      setError('Could not load documents.');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function handleDownload(doc: FlatDocument): Promise<void> {
    setDownloadingId(doc.id);
    try {
      const blob = await fetchDocumentBlob(doc.id);
      triggerDownload(blob, doc.originalFileName);
    } catch {
      setError('Could not download this document.');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleVerifySubmit(
    status: DocumentVerificationStatus,
    note: string,
  ): Promise<void> {
    if (!verifying) return;
    setVerifyBusy(true);
    try {
      await updateDocumentVerification(verifying.id, status, note || undefined);
      setVerifying(null);
      await load();
    } catch {
      setError('Could not update verification status.');
    } finally {
      setVerifyBusy(false);
    }
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  if (documents === null) {
    return <LoadingState message="Loading documents…" />;
  }

  if (documents.length === 0) {
    return <EmptyState message="No documents uploaded yet." />;
  }

  return (
    <div>
      {documents.map((doc) => (
        <div
          key={doc.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) 0',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className={styles.fileName}>{doc.originalFileName}</div>
            <div
              style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--color-text-secondary)' }}
            >
              {doc.typeLabel} · {formatFileSize(doc.fileSizeBytes)} ·{' '}
              {new Date(doc.uploadedAt).toLocaleDateString()}
            </div>
            <div style={{ marginTop: 4 }}>
              <span className={`${styles.badge} ${BADGE_CLASS[doc.verificationStatus]}`}>
                {BADGE_LABEL[doc.verificationStatus]}
              </span>
              {doc.verifiedByName && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 'var(--font-size-body-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  by {doc.verifiedByName}
                </span>
              )}
            </div>
          </div>
          <div className={styles.actions}>
            <Button size="sm" variant="secondary" onClick={() => setPreviewing(doc)}>
              Preview
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={downloadingId === doc.id}
              onClick={() => void handleDownload(doc)}
            >
              {downloadingId === doc.id ? 'Downloading…' : 'Download'}
            </Button>
            {canVerify && (
              <Button size="sm" variant="secondary" onClick={() => setVerifying(doc)}>
                Verify
              </Button>
            )}
            {canVerify && (
              <Button size="sm" variant="secondary" onClick={() => setViewingAudit(doc)}>
                Audit
              </Button>
            )}
          </div>
        </div>
      ))}

      {previewing && (
        <DocumentPreviewModal
          documentId={previewing.id}
          fileName={previewing.originalFileName}
          mimeType={previewing.mimeType}
          onClose={() => setPreviewing(null)}
        />
      )}

      {verifying && (
        <VerificationModal
          fileName={verifying.originalFileName}
          currentStatus={verifying.verificationStatus}
          busy={verifyBusy}
          onSubmit={(status, note) => void handleVerifySubmit(status, note)}
          onClose={() => setVerifying(null)}
        />
      )}

      {viewingAudit && (
        <DocumentAuditModal
          documentId={viewingAudit.id}
          fileName={viewingAudit.originalFileName}
          onClose={() => setViewingAudit(null)}
        />
      )}
    </div>
  );
}
