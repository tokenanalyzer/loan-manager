import { useState, type FormEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { FormActions, FormField, FormInput } from '../../components/ui/FormLayout';
import { Modal } from '../../components/ui/Modal';

import type { DisburseLoanPayload } from './workspace-api';

/**
 * Approve → Disburse. The actual bank transfer happens outside this
 * system (no payment-gateway integration) — this modal only records
 * proof it happened: the bank's own transaction reference (UTR for
 * NEFT/RTGS/IMPS). Submitting this is what flips the loan PENDING →
 * ACTIVE, which is what activates rewards and Top-Up eligibility.
 */
export function DisburseModal({
  principalAmount,
  bankAccountLast4,
  bankIfscCode,
  busy,
  onSubmit,
  onClose,
}: {
  principalAmount: string;
  bankAccountLast4?: string | null;
  bankIfscCode?: string | null;
  busy: boolean;
  onSubmit: (payload: DisburseLoanPayload) => void;
  onClose: () => void;
}): JSX.Element {
  const [disbursementReference, setDisbursementReference] = useState('');
  const [remarks, setRemarks] = useState('');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSubmit({ disbursementReference: disbursementReference.trim(), remarks: remarks || undefined });
  }

  return (
    <Modal title="Disburse loan" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, fontSize: 'var(--font-size-body-md)', color: 'var(--color-text-secondary)' }}>
          Confirm the bank transfer of <strong>{principalAmount}</strong> has been made
          {bankAccountLast4 ? ` to account ending ${bankAccountLast4}` : ''}
          {bankIfscCode ? ` (IFSC ${bankIfscCode})` : ''}, then enter the transaction reference below.
        </p>

        <FormField label="Bank transaction reference (UTR)" htmlFor="disbursementReference">
          <FormInput
            id="disbursementReference"
            type="text"
            required
            maxLength={128}
            value={disbursementReference}
            onChange={(event) => setDisbursementReference(event.target.value)}
            placeholder="e.g. UTR2026072300012345"
          />
        </FormField>

        <FormField label="Remarks (optional)" htmlFor="remarks">
          <textarea
            id="remarks"
            rows={3}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
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
          <Button type="submit" disabled={busy || disbursementReference.trim().length === 0}>
            {busy ? 'Disbursing…' : 'Confirm disbursement'}
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
}
