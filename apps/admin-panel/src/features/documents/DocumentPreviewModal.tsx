import { useEffect, useState } from 'react';

import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

import styles from './DocumentPreviewModal.module.css';
import { fetchDocumentBlob, triggerDownload } from './documents-api';

/**
 * Document Preview + Download — the staff content endpoint requires a
 * bearer token, so it can't be used as a plain `<img>`/`<iframe> src`;
 * this fetches the bytes via the authenticated API client (which is
 * also how every open counts as a Download-Audited access on the
 * backend) and renders them from an object URL, revoked on close.
 */
export function DocumentPreviewModal({
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
  const [blob, setBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    fetchDocumentBlob(documentId)
      .then((data) => {
        if (cancelled) return;
        setBlob(data);
        url = URL.createObjectURL(data);
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
    <Modal title={fileName} onClose={onClose} size={fullScreen ? 'fullscreen' : 'default'}>
      <div className={styles.preview}>
        {error && <ErrorState message={error} />}
        {!error && !objectUrl && <LoadingState message="Loading document…" />}
        {!error && objectUrl && isImage && (
          <img
            src={objectUrl}
            alt={fileName}
            className={`${styles.image} ${fullScreen ? styles.imageFullscreen : ''}`}
          />
        )}
        {!error && objectUrl && isPdf && (
          <iframe
            src={objectUrl}
            title={fileName}
            className={`${styles.frame} ${fullScreen ? styles.frameFullscreen : ''}`}
          />
        )}
        {!error && objectUrl && !isImage && !isPdf && (
          <div className={styles.fallback}>
            <p>Preview isn&rsquo;t available for this file type.</p>
          </div>
        )}
      </div>
      <div className={styles.footer}>
        <Button variant="secondary" onClick={() => setFullScreen((value) => !value)}>
          {fullScreen ? 'Exit Full Screen' : 'Full Screen'}
        </Button>
        <Button disabled={!blob} onClick={() => blob && triggerDownload(blob, fileName)}>
          Download
        </Button>
      </div>
    </Modal>
  );
}
