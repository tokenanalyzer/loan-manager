import type { StaffUser } from '@loan-manager/shared-types';
import { useState } from 'react';

import { Button } from '../../components/ui/Button';
import { FormActions, FormField, FormInput } from '../../components/ui/FormLayout';
import { Modal } from '../../components/ui/Modal';

import { archiveStaffUser, disableStaffUser, restoreStaffUser } from './staff-api';

type LifecycleAction = 'disable' | 'archive' | 'restore';

const COPY: Record<LifecycleAction, { title: string; description: string; cta: string }> = {
  disable: {
    title: 'Disable staff account',
    description:
      'A reversible suspension — sessions are revoked immediately and sign-in is blocked, but nothing else about the account changes. Restore it at any time.',
    cta: 'Disable account',
  },
  archive: {
    title: 'Archive staff account',
    description:
      'For someone who has actually left. Sessions are revoked and the account is removed from active assignment — still fully reversible via Restore, never a delete.',
    cta: 'Archive account',
  },
  restore: {
    title: 'Restore staff account',
    description: 'This will reactivate the account and restore its previous role. Sign-in will work again immediately.',
    cta: 'Restore account',
  },
};

/**
 * Shared modal for the three Phase 3 lifecycle actions. Disable/Archive
 * require a mandatory reason (backend-enforced too — this is a UX
 * nudge, not the actual gate); Restore is a plain confirmation.
 */
export function StaffLifecycleModal({
  action,
  user,
  onClose,
  onDone,
}: {
  action: LifecycleAction;
  user: StaffUser;
  onClose: () => void;
  onDone: () => void;
}): JSX.Element {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[action];
  const requiresReason = action === 'disable' || action === 'archive';
  const canSubmit = !requiresReason || reason.trim() !== '';

  async function handleConfirm(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      if (action === 'disable') {
        await disableStaffUser(user.id, reason.trim());
      } else if (action === 'archive') {
        await archiveStaffUser(user.id, reason.trim());
      } else {
        await restoreStaffUser(user.id);
      }
      onDone();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not complete this action. Please try again.';
      setError(Array.isArray(message) ? message.join(' ') : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={copy.title} onClose={onClose}>
      <p>
        <strong>{user.fullName ?? user.email}</strong> — {copy.description}
      </p>

      {requiresReason && (
        <FormField label="Reason (required)" htmlFor="lifecycle-reason">
          <FormInput
            id="lifecycle-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={action === 'disable' ? 'e.g. Under investigation' : 'e.g. Resigned effective today'}
          />
        </FormField>
      )}

      {error && (
        <p role="alert" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}

      <FormActions>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant={action === 'restore' ? 'primary' : 'danger'}
          onClick={() => void handleConfirm()}
          disabled={!canSubmit || submitting}
        >
          {submitting ? 'Working…' : copy.cta}
        </Button>
      </FormActions>
    </Modal>
  );
}
