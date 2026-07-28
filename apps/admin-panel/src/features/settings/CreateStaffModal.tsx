import type { CreateStaffUserPayload } from '@loan-manager/shared-types';
import { useState } from 'react';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormActions, FormField, FormInput, FormRow, FormSelect } from '../../components/ui/FormLayout';
import { Modal } from '../../components/ui/Modal';
import { useDirtyClose } from '../../components/ui/useDirtyClose';

import { createStaffUser } from './staff-api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  fullName?: string;
  email?: string;
  employeeCode?: string;
}

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isEmployee = role === 'employee';
  const isDirty = email.trim() !== '' || fullName.trim() !== '' || employeeCode.trim() !== '' || role !== 'employee';
  const { confirming, requestClose, confirmDiscard, cancelDiscard } = useDirtyClose(isDirty, onClose);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (fullName.trim() === '') errors.fullName = 'Full name is required.';
    if (email.trim() === '') errors.email = 'Email is required.';
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (isEmployee && employeeCode.trim() === '') errors.employeeCode = 'Employee code is required.';
    return errors;
  }

  async function handleSubmit(): Promise<void> {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

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
    <>
      <Modal title="Add staff account" onClose={requestClose}>
        <FormField label="Full name" htmlFor="staff-full-name" error={fieldErrors.fullName}>
          <FormInput
            id="staff-full-name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            placeholder="Priya Sharma"
          />
        </FormField>

        <FormField label="Email" htmlFor="staff-email" error={fieldErrors.email}>
          <FormInput
            id="staff-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="priya@company.com"
          />
        </FormField>

        <FormRow>
          <FormField label="Role" htmlFor="staff-role">
            <FormSelect
              id="staff-role"
              value={role}
              onChange={(e) => setRole(e.target.value as CreateStaffUserPayload['role'])}
            >
              <option value="employee">Employee</option>
              <option value="admin">Super Admin</option>
            </FormSelect>
          </FormField>

          {isEmployee && (
            <FormField label="Employee code" htmlFor="staff-employee-code" error={fieldErrors.employeeCode}>
              <FormInput
                id="staff-employee-code"
                value={employeeCode}
                onChange={(e) => {
                  setEmployeeCode(e.target.value);
                  if (fieldErrors.employeeCode) setFieldErrors((prev) => ({ ...prev, employeeCode: undefined }));
                }}
                placeholder="EMP-0042"
              />
            </FormField>
          )}
        </FormRow>

        {error && <Alert variant="error" message={error} />}

        <FormActions>
          <Button variant="secondary" onClick={requestClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </Button>
        </FormActions>
      </Modal>

      {confirming && (
        <ConfirmDialog
          title="Discard this account?"
          message="You've entered details for a new staff account that haven't been saved. Discard them?"
          confirmLabel="Discard"
          variant="danger"
          onConfirm={confirmDiscard}
          onCancel={cancelDiscard}
        />
      )}
    </>
  );
}
