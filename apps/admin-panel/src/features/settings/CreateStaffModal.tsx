import type { CreateStaffUserPayload } from '@loan-manager/shared-types';
import { useState } from 'react';

import { Button } from '../../components/ui/Button';
import { FormActions, FormField, FormInput, FormRow } from '../../components/ui/FormLayout';
import { Modal } from '../../components/ui/Modal';

import { createStaffUser } from './staff-api';

/**
 * Creates a pre-provisioned employee/admin account. The person can't
 * sign in until they complete a real Firebase sign-in with this exact
 * email — see `AuthService`'s linking gate on the backend for the
 * full set of conditions that has to hold before that link is made.
 */
export function CreateStaffModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}): JSX.Element {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<CreateStaffUserPayload['role']>('employee');
  const [employeeCode, setEmployeeCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isEmployee = role === 'employee';
  const canSubmit = email.trim() !== '' && fullName.trim() !== '' && (!isEmployee || employeeCode.trim() !== '');

  async function handleSubmit(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      const created = await createStaffUser({
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        ...(isEmployee ? { employeeCode: employeeCode.trim() } : {}),
      });
      setInviteLink(created.inviteLink);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not create the account. Please try again.';
      setError(Array.isArray(message) ? message.join(' ') : message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyLink(): Promise<void> {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  }

  // The invite link is only ever in this response — it isn't stored,
  // so it can't be re-fetched later. Once created, the modal switches
  // to a copy-only view instead of the form.
  if (inviteLink) {
    return (
      <Modal title="Staff account created" onClose={onCreated}>
        <p>
          <strong>{fullName.trim()}</strong> ({email.trim()}) can now sign in once they set a
          password. Send them this one-time invite link — it won&apos;t be shown again.
        </p>
        <FormField label="Invite link" htmlFor="staff-invite-link">
          <FormInput id="staff-invite-link" value={inviteLink} readOnly onFocus={(e) => e.target.select()} />
        </FormField>
        <FormActions>
          <Button variant="secondary" onClick={() => void handleCopyLink()}>
            {copied ? 'Copied!' : 'Copy invite link'}
          </Button>
          <Button onClick={onCreated}>Done</Button>
        </FormActions>
      </Modal>
    );
  }

  return (
    <Modal title="Add staff account" onClose={onClose}>
      <FormField label="Full name" htmlFor="staff-full-name">
        <FormInput
          id="staff-full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Priya Sharma"
        />
      </FormField>

      <FormField label="Email" htmlFor="staff-email">
        <FormInput
          id="staff-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="priya@company.com"
        />
      </FormField>

      <FormRow>
        <FormField label="Role" htmlFor="staff-role">
          <select
            id="staff-role"
            value={role}
            onChange={(e) => setRole(e.target.value as CreateStaffUserPayload['role'])}
          >
            <option value="employee">Employee</option>
            <option value="admin">Super Admin</option>
          </select>
        </FormField>

        {isEmployee && (
          <FormField label="Employee code" htmlFor="staff-employee-code">
            <FormInput
              id="staff-employee-code"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="EMP-0042"
            />
          </FormField>
        )}
      </FormRow>

      {error && (
        <p role="alert" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}

      <FormActions>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={!canSubmit || submitting}>
          {submitting ? 'Creating…' : 'Create account'}
        </Button>
      </FormActions>
    </Modal>
  );
}
