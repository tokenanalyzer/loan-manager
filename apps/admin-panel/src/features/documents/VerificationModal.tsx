import type { DocumentVerificationStatus } from '@loan-manager/shared-types';
import { useState, type FormEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { FormActions, FormField } from '../../components/ui/FormLayout';
import { Modal } from '../../components/ui/Modal';

/** Verification Status — staff sets pending/verified/rejected, with an optional note. */
export function VerificationModal({
  fileName,
  currentStatus,
  busy,
  onSubmit,
  onClose,
}: {
  fileName: string;
  currentStatus: DocumentVerificationStatus;
  busy: boolean;
  onSubmit: (status: DocumentVerificationStatus, note: string) => void;
  onClose: () => void;
}): JSX.Element {
  const [status, setStatus] = useState<DocumentVerificationStatus>(currentStatus);
  const [note, setNote] = useState('');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSubmit(status, note);
  }

  return (
    <Modal title={`Verify — ${fileName}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="Verification status" htmlFor="verificationStatus">
          <select
            id="verificationStatus"
            value={status}
            onChange={(event) => setStatus(event.target.value as DocumentVerificationStatus)}
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--font-size-body-md)',
              color: 'var(--color-text-primary)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-control)',
              padding: 'var(--space-3) var(--space-4)',
            }}
          >
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </FormField>

        <FormField label="Note (optional)" htmlFor="verificationNote">
          <textarea
            id="verificationNote"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            style={{
              width: '100%',
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--font-size-body-md)',
              color: 'var(--color-text-primary)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-control)',
              padding: 'var(--space-3) var(--space-4)',
              resize: 'vertical',
            }}
          />
        </FormField>

        <FormActions>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
}
