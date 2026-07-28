import type { StaffLifecycleOutcome, StaffUser, UserRole } from '@loan-manager/shared-types';
import { useState } from 'react';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { FormActions, FormField, FormInput } from '../../components/ui/FormLayout';
import { Modal } from '../../components/ui/Modal';

import { archiveStaffUser, disableStaffUser, resetStaffPassword, restoreStaffUser } from './staff-api';

export type LifecycleAction = 'disable' | 'archive' | 'restore' | 'reset-password';

/** Phase 5: an `ORG_ADMIN` actor's Disable/Archive/Restore goes through Super Admin approval instead of applying immediately — reflected in the confirmation copy before submit, not just the result. */
function requiresApprovalCopy(action: LifecycleAction, actorRole: UserRole | undefined): string | null {
  if (actorRole !== 'org_admin' || (action !== 'disable' && action !== 'archive' && action !== 'restore')) {
    return null;
  }
  return 'This will be submitted for Super Admin approval — the account will not change until it is reviewed.';
}

function copyFor(action: LifecycleAction, user: StaffUser): { title: string; description: string; cta: string } {
  switch (action) {
    case 'disable':
      return {
        title: 'Disable staff account',
        description:
          'A reversible suspension — sessions are revoked immediately and sign-in is blocked, but nothing else about the account changes. Restore it at any time.',
        cta: 'Disable account',
      };
    case 'archive':
      return {
        title: 'Archive staff account',
        description:
          'For someone who has actually left. Sessions are revoked and the account is removed from active assignment — still fully reversible via Restore, never a delete.',
        cta: 'Archive account',
      };
    case 'restore':
      return {
        title: 'Restore staff account',
        description:
          'This will reactivate the account and restore its previous role. Sign-in will work again immediately.',
        cta: 'Restore account',
      };
    case 'reset-password':
      return user.activatedAt
        ? {
            title: 'Reset password',
            description:
              "This generates a fresh, one-time password-setup link. Their current password keeps working until they use it.",
            cta: 'Generate link',
          }
        : {
            title: 'Resend invite',
            description:
              "This account hasn't signed in yet — generate a fresh invite link (the original one is no longer available).",
            cta: 'Resend invite',
          };
  }
}

/**
 * Shared modal for all four Team Management lifecycle actions.
 * Disable/Archive require a mandatory reason (backend-enforced too —
 * this is a UX nudge, not the actual gate); Restore is a plain
 * confirmation; Resend Invite/Password Reset (Phase 4 — same backend
 * action, see `UsersService.resendInviteOrResetPassword`) confirm then
 * show the freshly-generated one-time link, same pattern as
 * `CreateStaffModal`'s post-creation view.
 */
export function StaffLifecycleModal({
  action,
  user,
  actorRole,
  onClose,
  onDone,
}: {
  action: LifecycleAction;
  user: StaffUser;
  /** The signed-in staff member performing this action — determines whether Disable/Archive/Restore go through Super Admin approval (Phase 5). */
  actorRole: UserRole | undefined;
  onClose: () => void;
  onDone: (outcome: 'executed' | 'pending_approval') => void;
}): JSX.Element {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultLink, setResultLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingSubmitted, setPendingSubmitted] = useState(false);
  const copy = copyFor(action, user);
  const approvalNote = requiresApprovalCopy(action, actorRole);
  const requiresReason = action === 'disable' || action === 'archive';
  const canSubmit = !requiresReason || reason.trim() !== '';

  function handleLifecycleResult(result: StaffLifecycleOutcome): void {
    if (result.outcome === 'pending_approval') {
      setPendingSubmitted(true);
    } else {
      onDone('executed');
    }
  }

  async function handleConfirm(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      if (action === 'disable') {
        handleLifecycleResult(await disableStaffUser(user.id, reason.trim()));
      } else if (action === 'archive') {
        handleLifecycleResult(await archiveStaffUser(user.id, reason.trim()));
      } else if (action === 'restore') {
        handleLifecycleResult(await restoreStaffUser(user.id));
      } else {
        const result = await resetStaffPassword(user.id);
        setResultLink(result.inviteLink);
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not complete this action. Please try again.';
      setError(Array.isArray(message) ? message.join(' ') : message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyLink(): Promise<void> {
    if (!resultLink) return;
    await navigator.clipboard.writeText(resultLink);
    setCopied(true);
  }

  if (pendingSubmitted) {
    return (
      <Modal title={copy.title} onClose={() => onDone('pending_approval')}>
        <p>
          Your request to {copy.title.toLowerCase()} for <strong>{user.fullName ?? user.email}</strong> was
          submitted for Super Admin approval. The account will not change until it is reviewed.
        </p>
        <FormActions>
          <Button onClick={() => onDone('pending_approval')}>Done</Button>
        </FormActions>
      </Modal>
    );
  }

  if (resultLink) {
    return (
      <Modal title={copy.title} onClose={() => onDone('executed')}>
        <p>
          A new one-time link was generated for <strong>{user.fullName ?? user.email}</strong>. Send it to them
          — it won&apos;t be shown again.
        </p>
        <FormField label="Link" htmlFor="lifecycle-result-link">
          <FormInput id="lifecycle-result-link" value={resultLink} readOnly onFocus={(e) => e.target.select()} />
        </FormField>
        <FormActions>
          <Button variant="secondary" onClick={() => void handleCopyLink()}>
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
          <Button onClick={() => onDone('executed')}>Done</Button>
        </FormActions>
      </Modal>
    );
  }

  return (
    <Modal title={copy.title} onClose={onClose}>
      <p>
        <strong>{user.fullName ?? user.email}</strong> — {copy.description}
      </p>

      {approvalNote && (
        <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>{approvalNote}</p>
      )}

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

      {error && <Alert variant="error" message={error} />}

      <FormActions>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant={action === 'restore' || action === 'reset-password' ? 'primary' : 'danger'}
          onClick={() => void handleConfirm()}
          disabled={!canSubmit || submitting}
        >
          {submitting ? 'Working…' : copy.cta}
        </Button>
      </FormActions>
    </Modal>
  );
}
