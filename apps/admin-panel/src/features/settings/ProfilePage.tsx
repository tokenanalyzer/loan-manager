import type { LeadSummary } from '@loan-manager/shared-types';
import { useCallback, useEffect, useState } from 'react';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { FormActions, FormField, FormInput, FormRow, FormSection } from '../../components/ui/FormLayout';
import { PageContainer } from '../../components/ui/PageContainer';
import { StatCard } from '../../components/ui/StatCard';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../core/auth-context';
import { ROLE_LABELS } from '../../core/constants';
import { computeMyPerformanceSummary } from '../employee/performance-summary';
import { fetchMyLeads } from '../workspace/workspace-api';

import { updateProfile } from './profile-api';
import styles from './ProfilePage.module.css';

function formatHireDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

/**
 * Settings → Profile. Self-service edit of the current user's own
 * identity — deliberately just Full Name/Phone (see
 * `UpdateProfileDto`'s doc comment for why Email/Role aren't
 * editable here). `useAuth().refreshProfile` re-syncs the Topbar/
 * Sidebar identity immediately after a successful save.
 */
export function ProfilePage(): JSX.Element {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullNameError, setFullNameError] = useState<string | null>(null);

  const isEmployee = profile?.role === 'employee';
  const [myLeads, setMyLeads] = useState<LeadSummary[] | null>(null);
  const [performanceError, setPerformanceError] = useState<string | null>(null);

  const loadPerformance = useCallback(async () => {
    if (!isEmployee) return;
    setPerformanceError(null);
    try {
      setMyLeads(await fetchMyLeads());
    } catch {
      setPerformanceError('Could not load your performance summary.');
    }
  }, [isEmployee]);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  const isDirty =
    !!profile && (fullName.trim() !== (profile.fullName ?? '') || phone.trim() !== (profile.phone ?? ''));

  // Warns on a tab close/refresh with unsaved edits — in-app navigation
  // (e.g. clicking another sidebar link) isn't blocked here; see the
  // Design System Phase 3-4 memory for why that's an explicit, scoped
  // decision rather than an oversight.
  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  if (!profile) {
    return (
      <PageContainer title="Profile">
        <p>Loading…</p>
      </PageContainer>
    );
  }

  async function handleSubmit(): Promise<void> {
    if (fullName.trim() === '') {
      setFullNameError('Full name is required.');
      return;
    }
    setFullNameError(null);
    setSubmitting(true);
    setError(null);
    try {
      await updateProfile({
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      await refreshProfile();
      toast.success('Your profile was updated.');
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
      <FormField label="Email" htmlFor="profile-email">
        <FormInput id="profile-email" value={profile.email ?? '—'} readOnly disabled />
      </FormField>

      <FormRow>
        <FormField label="Full name" htmlFor="profile-full-name" error={fullNameError ?? undefined}>
          <FormInput
            id="profile-full-name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (fullNameError) setFullNameError(null);
            }}
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
        <Button onClick={() => void handleSubmit()} disabled={!isDirty || submitting}>
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </FormActions>

      {isEmployee && profile.employeeProfile && (
        <FormSection title="Employee details">
          <FormRow>
            <FormField label="Employee code" htmlFor="profile-employee-code">
              <FormInput id="profile-employee-code" value={profile.employeeProfile.employeeCode} readOnly disabled />
            </FormField>
            <FormField label="Department" htmlFor="profile-department">
              <FormInput
                id="profile-department"
                value={profile.employeeProfile.department ?? '—'}
                readOnly
                disabled
              />
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label="Branch" htmlFor="profile-branch">
              <FormInput id="profile-branch" value={profile.employeeProfile.branch ?? '—'} readOnly disabled />
            </FormField>
            <FormField label="Hire date" htmlFor="profile-hire-date">
              <FormInput
                id="profile-hire-date"
                value={formatHireDate(profile.employeeProfile.hireDate)}
                readOnly
                disabled
              />
            </FormField>
          </FormRow>
        </FormSection>
      )}

      {isEmployee && (
        <FormSection title="Performance summary">
          {performanceError && <Alert variant="error" message={performanceError} />}
          {!performanceError && myLeads === null && <p>Loading…</p>}
          {!performanceError && myLeads !== null && (
            <div className={styles.statGrid}>
              {(() => {
                const summary = computeMyPerformanceSummary(myLeads);
                return (
                  <>
                    <StatCard label="Assigned" value={String(summary.assigned)} icon="inbox" tint="indigo" />
                    <StatCard
                      label="Approved"
                      value={String(summary.approved)}
                      icon="checkCircle"
                      tint="green"
                      footerNote={
                        summary.approvalRate !== null
                          ? `${summary.approvalRate.toFixed(1)}% approval rate`
                          : undefined
                      }
                    />
                    <StatCard label="Rejected" value={String(summary.rejected)} icon="close" tint="amber" />
                    <StatCard label="Disbursed" value={String(summary.disbursed)} icon="document" tint="electric" />
                  </>
                );
              })()}
            </div>
          )}
        </FormSection>
      )}
    </PageContainer>
  );
}
