import { useState, type CSSProperties, type FormEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { FormActions, FormField, FormInput } from '../../components/ui/FormLayout';
import { Modal } from '../../components/ui/Modal';

import type { ReviewLeadPayload } from './workspace-api';

/**
 * Employee review — Approve / Reject / Raise Query. One modal shape,
 * reused for all three since they're all just the existing review
 * endpoint with a different `decision` and payload.
 */
export function ReviewModal({
  action,
  busy,
  onSubmit,
  onClose,
}: {
  action: 'approve' | 'reject' | 'query';
  busy: boolean;
  onSubmit: (payload: ReviewLeadPayload) => void;
  onClose: () => void;
}): JSX.Element {
  const [interestRate, setInterestRate] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    if (action === 'approve') {
      onSubmit({ decision: 'approve', interestRate: Number(interestRate) });
    } else if (action === 'reject') {
      onSubmit({ decision: 'reject', rejectionReason: message || undefined });
    } else {
      onSubmit({ decision: 'query', queryMessage: message });
    }
  }

  const title =
    action === 'approve' ? 'Approve lead' : action === 'reject' ? 'Reject lead' : 'Raise a query';

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {action === 'approve' && (
          <FormField label="Interest rate (% p.a.)" htmlFor="interestRate">
            <FormInput
              id="interestRate"
              type="number"
              step="0.001"
              min="0"
              required
              value={interestRate}
              onChange={(event) => setInterestRate(event.target.value)}
            />
          </FormField>
        )}

        {action === 'reject' && (
          <FormField label="Reason (optional — shown to the customer)" htmlFor="reason">
            <textarea
              id="reason"
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              style={textareaStyle}
            />
          </FormField>
        )}

        {action === 'query' && (
          <FormField label="What do you need from the customer?" htmlFor="queryMessage">
            <textarea
              id="queryMessage"
              rows={4}
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              style={textareaStyle}
            />
          </FormField>
        )}

        <FormActions>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant={action === 'reject' ? 'danger' : 'primary'} disabled={busy}>
            {busy ? 'Submitting…' : title}
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
}

const textareaStyle: CSSProperties = {
  width: '100%',
  fontFamily: 'var(--font-family)',
  fontSize: 'var(--font-size-body-md)',
  color: 'var(--color-text-primary)',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-control)',
  padding: 'var(--space-3) var(--space-4)',
  resize: 'vertical',
};
