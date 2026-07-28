import { useState } from 'react';

import { SuccessBanner } from '../../components/states/SuccessBanner';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { FormActions, FormField, FormInput, FormRow } from '../../components/ui/FormLayout';
import { PageContainer } from '../../components/ui/PageContainer';
import { useAuth } from '../../core/auth-context';
import { ROLE_LABELS } from '../../core/constants';

import { updateProfile } from './profile-api';

/**
 * Settings → Profile. Self-service edit of the current user's own
 * identity — deliberately just Full Name/Phone (see
 * `UpdateProfileDto`'s doc comment for why Email/Role aren't
 * editable here). `useAuth().refreshProfile` re-syncs the Topbar/
 * Sidebar identity immediately after a successful save.
 */
export function ProfilePage(): JSX.Element {
  const { profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!profile) {
    return (
      <PageContainer title="Profile">
        <p>Loading…</p>
      </PageContainer>
    );
  }

  const isDirty = fullName.trim() !== (profile.fullName ?? '') || phone.trim() !== (profile.phone ?? '');

  async function handleSubmit(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      await updateProfile({
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      await refreshProfile();
      setSuccessMessage('Your profile was updated.');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not save your profile. Please try again.';
      setError(Array.isArray(message) ? message.join(' ') : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer title="Profile" description="Your own account details.">
      {successMessage && <SuccessBanner message={successMessage} onDismiss={() => setSuccessMessage(null)} />}

      <FormField label="Email" htmlFor="profile-email">
        <FormInput id="profile-email" value={profile.email ?? '—'} readOnly disabled />
      </FormField>

      <FormRow>
        <FormField label="Full name" htmlFor="profile-full-name">
          <FormInput
            id="profile-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
          />
        </FormField>

        <FormField label="Phone" htmlFor="profile-phone">
          <FormInput
            id="profile-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />
        </FormField>
      </FormRow>

      <FormField label="Role" htmlFor="profile-role">
        <FormInput id="profile-role" value={ROLE_LABELS[profile.role]} readOnly disabled />
      </FormField>

      {error && <Alert variant="error" message={error} />}

      <FormActions>
        <Button
          onClick={() => void handleSubmit()}
          disabled={!isDirty || fullName.trim() === '' || submitting}
        >
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </FormActions>
    </PageContainer>
  );
}
