import type { ApprovalRequest } from '@loan-manager/shared-types';
import { useState } from 'react';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormActions, FormField, FormInput } from '../../components/ui/FormLayout';
import { Modal } from '../../components/ui/Modal';
import { useDirtyClose } from '../../components/ui/useDirtyClose';
import { ROLE_LABELS } from '../../core/constants';

import { decideApproval } from './approvals-api';
import { describeAction } from './approvals-meta';

/**
 * Approve/Reject a single pending request. Mirrors
 * `StaffLifecycleModal`'s structure/styling — a decision note is
 * required to reject (backend-enforced too, this is a UX nudge) and
 * optional to approve.
 */
export function ApprovalDecisionModal({
  request,
  onClose,
  onDone,
}: {
  request: ApprovalRequest;
  onClose: () => void;
  onDone: (outcome: 'approved' | 'rejected') => void;
}): JSX.Element {
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = decision === 'approve' || (decision === 'reject' && decisionNote.trim() !== '');
  const isDirty = decision !== null || decisionNote.trim() !== '';
  const { confirming, requestClose, confirmDiscard, cancelDiscard } = useDirtyClose(isDirty, onClose);

  async function handleConfirm(): Promise<void> {
    if (!decision) return;
    setSubmitting(true);
    setError(null);
    try {
      await decideApproval(request.id, {
        decision,
        decisionNote: decisionNote.trim() || undefined,
      });
      onDone(decision === 'approve' ? 'approved' : 'rejected');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not record this decision. Please try again.';
      setError(Array.isArray(message) ? message.join(' ') : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <Modal title="Review approval request" onClose={requestClose}>
      <p>
        <strong>{request.makerName ?? 'A staff member'}</strong> ({ROLE_LABELS.org_admin}) requested to{' '}
        <strong>{describeAction(request.action).toLowerCase()}</strong> for{' '}
        <strong>{request.targetUserName ?? request.targetUserEmail ?? 'this account'}</strong>.
      </p>
      {typeof request.payload?.reason === 'string' && request.payload.reason && (
        <p>
          Reason given: <em>{request.payload.reason}</em>
        </p>
      )}

      <FormActions>
        <Button
          variant={decision === 'approve' ? 'primary' : 'secondary'}
          onClick={() => setDecision('approve')}
          disabled={submitting}
        >
          Approve
        </Button>
        <Button
          variant={decision === 'reject' ? 'danger' : 'secondary'}
          onClick={() => setDecision('reject')}
          disabled={submitting}
        >
          Reject
        </Button>
      </FormActions>

      {decision && (
        <FormField
          label={decision === 'reject' ? 'Reason for rejection (required)' : 'Note (optional)'}
          htmlFor="approval-decision-note"
        >
          <FormInput
            id="approval-decision-note"
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            placeholder={decision === 'reject' ? 'e.g. Insufficient justification' : 'Optional note'}
          />
        </FormField>
      )}

      {error && <Alert variant="error" message={error} />}

      <FormActions>
        <Button variant="secondary" onClick={requestClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleConfirm()} disabled={!decision || !canSubmit || submitting}>
          {submitting ? 'Working…' : 'Submit decision'}
        </Button>
      </FormActions>
    </Modal>

    {confirming && (
      <ConfirmDialog
        title="Discard this decision?"
        message="You have an in-progress decision that hasn't been submitted. Discard it?"
        confirmLabel="Discard"
        variant="danger"
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />
    )}
    </>
  );
}
