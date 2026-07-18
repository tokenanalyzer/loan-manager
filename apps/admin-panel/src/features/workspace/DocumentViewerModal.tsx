import { useEffect, useState } from 'react';

import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

import styles from './DocumentViewerModal.module.css';
import { fetchDocumentBlob } from './workspace-api';

/**
 * Document Viewer — the staff content endpoint requires a bearer
 * token, so it can't be used as a plain `<img>`/`<iframe> src`; this
 * fetches the bytes via the authenticated API client and renders them
 * from an object URL instead, revoked on close.
 */
export function DocumentViewerModal({
  documentId,
  fileName,
  mimeType,
  onClose,
}: {
  documentId: string;
  fileName: string;
  mimeType: string | null;
  onClose: () => void;
}): JSX.Element {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    fetchDocumentBlob(documentId)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this document.');
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentId]);

  const isImage = mimeType?.startsWith('image/') ?? false;
  const isPdf = mimeType === 'application/pdf';

  return (
    <Modal title={fileName} onClose={onClose}>
      <div className={styles.preview}>
        {error && <ErrorState message={error} />}
        {!error && !objectUrl && <LoadingState message="Loading document…" />}
        {!error && objectUrl && isImage && (
          <img src={objectUrl} alt={fileName} className={styles.image} />
        )}
        {!error && objectUrl && isPdf && (
          <iframe src={objectUrl} title={fileName} className={styles.frame} />
        )}
        {!error && objectUrl && !isImage && !isPdf && (
          <div className={styles.fallback}>
            <p>Preview isn&rsquo;t available for this file type.</p>
            <Button
              onClick={() => {
                const link = document.createElement('a');
                link.href = objectUrl;
                link.download = fileName;
                link.click();
              }}
            >
              Download {fileName}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
