import type { LeadAssignmentHistoryEntry, LeadSummary } from '@loan-manager/shared-types';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageContainer } from '../../components/ui/PageContainer';
import { DocumentManagementCenter } from '../documents/DocumentManagementCenter';

import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, REVIEWABLE_STATUSES } from './lead-status-meta';
import styles from './LeadDetailPage.module.css';
import { ReviewModal } from './ReviewModal';
import { useAutosaveNotes } from './useAutosaveNotes';
import {
  fetchCustomerProfile,
  fetchCustomerSummary,
  fetchLead,
  fetchLeadHistory,
  reviewLead,
  type CustomerProfile,
  type CustomerSummary,
  type ReviewLeadPayload,
} from './workspace-api';

interface TimelineEntry {
  key: string;
  title: string;
  meta: string;
  at: string;
}

function buildTimeline(lead: LeadSummary, history: LeadAssignmentHistoryEntry[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    {
      key: 'submitted',
      title: 'Application submitted',
      meta: 'By the customer',
      at: lead.submittedAt,
    },
  ];

  for (const entry of history) {
    const actionLabel =
      entry.action === 'assign'
        ? 'Assigned'
        : entry.action === 'reassign'
          ? 'Reassigned'
          : 'Transferred';
    entries.push({
      key: entry.id,
      title: `${actionLabel} to ${entry.newEmployeeName ?? 'an employee'}`,
      meta: `By ${entry.assignedByName ?? 'an administrator'}${
        entry.previousEmployeeName ? ` · previously ${entry.previousEmployeeName}` : ''
      }`,
      at: entry.createdAt,
    });
  }

  if (lead.queryRaisedAt) {
    entries.push({
      key: 'query-raised',
      title: 'Query raised',
      meta: `By ${lead.queryRaisedByName ?? 'an employee'} · ${lead.queryMessage ?? ''}`,
      at: lead.queryRaisedAt,
    });
  }
  if (lead.queryRespondedAt) {
    entries.push({
      key: 'query-responded',
      title: 'Customer responded',
      meta: 'Documents re-uploaded',
      at: lead.queryRespondedAt,
    });
  }
  if (lead.reviewedAt && lead.status === 'approved') {
    entries.push({
      key: 'decision',
      title: 'Application approved',
      meta: `By ${lead.reviewedByName ?? 'an employee'}`,
      at: lead.reviewedAt,
    });
  }
  if (lead.reviewedAt && lead.status === 'rejected') {
    entries.push({
      key: 'decision',
      title: 'Application rejected',
      meta: `By ${lead.reviewedByName ?? 'an employee'}${lead.rejectionReason ? ` · ${lead.rejectionReason}` : ''}`,
      at: lead.reviewedAt,
    });
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/**
 * Lead Detail — Customer Information, Document Viewer, Timeline /
 * Activity History, autosaved Internal Notes, and the Employee review
 * decision (Approve / Reject / Raise Query), all reusing existing
 * endpoints. Lead Locking: the underlying APIs already enforce that
 * only the assigned employee can read/write this lead (403
 * otherwise) — this page just surfaces that as a clear locked state
 * instead of a raw error.
 */
export function LeadDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<LeadSummary | null>(null);
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [history, setHistory] = useState<LeadAssignmentHistoryEntry[]>([]);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'query' | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  async function load(): Promise<void> {
    if (!id) return;
    setLoading(true);
    setError(null);
    setLocked(false);
    try {
      const leadData = await fetchLead(id);
      setLead(leadData);

      const [customerData, profileData, historyData] = await Promise.all([
        fetchCustomerSummary(leadData.applicantId),
        fetchCustomerProfile(leadData.applicantId).catch(() => null),
        fetchLeadHistory(id).catch(() => []),
      ]);
      setCustomer(customerData);
      setProfile(profileData);
      setHistory(historyData);
    } catch (err) {
      if (isForbidden(err)) {
        setLocked(true);
      } else {
        setError('Could not load this lead.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const notes = useAutosaveNotes(id ?? '', lead?.internalNotes ?? null);

  async function handleReviewSubmit(payload: ReviewLeadPayload): Promise<void> {
    if (!id) return;
    setReviewBusy(true);
    setReviewError(null);
    try {
      const updated = await reviewLead(id, payload);
      setLead(updated);
      setReviewAction(null);
      void load(); // refresh history/timeline alongside the new status
    } catch {
      setReviewError('That action failed. Please try again.');
    } finally {
      setReviewBusy(false);
    }
  }

  if (loading) {
    return (
      <PageContainer title="Lead">
        <LoadingState message="Loading lead…" />
      </PageContainer>
    );
  }

  if (locked) {
    return (
      <PageContainer title="Lead">
        <EmptyState
          icon="lock"
          title="This lead is no longer assigned to you"
          message="It may have been reassigned by an administrator. Return to your leads list."
          action={<Button onClick={() => navigate('/my-leads')}>Back to My Leads</Button>}
        />
      </PageContainer>
    );
  }

  if (error || !lead) {
    return (
      <PageContainer title="Lead">
        <ErrorState message={error ?? 'Lead not found.'} />
      </PageContainer>
    );
  }

  const timeline = buildTimeline(lead, history);
  const isReviewable = REVIEWABLE_STATUSES.includes(lead.status);

  return (
    <PageContainer
      title={lead.applicantName ?? 'Lead'}
      description={`${lead.requestedAmount} · ${lead.requestedTermMonths} months`}
      actions={
        <Button variant="secondary" onClick={() => navigate('/my-leads')}>
          Back to My Leads
        </Button>
      }
    >
      <div className={styles.grid}>
        <div className={styles.column}>
          <Card>
            <h2 className={styles.sectionTitle}>Lead details</h2>
            <div className={styles.fieldGrid}>
              <Field label="Status">
                <span style={{ color: LEAD_STATUS_COLORS[lead.status] }}>
                  {LEAD_STATUS_LABELS[lead.status]}
                </span>
              </Field>
              <Field label="Requested amount">{lead.requestedAmount}</Field>
              <Field label="Term">{lead.requestedTermMonths} months</Field>
              <Field label="Category">{lead.categoryId ?? '—'}</Field>
              <Field label="Purpose">{lead.purpose ?? '—'}</Field>
              <Field label="Submitted">{new Date(lead.submittedAt).toLocaleString()}</Field>
            </div>

            {lead.status === 'query_raised' && (
              <div className={styles.banner}>
                <span className={styles.bannerTitle}>Waiting on the customer</span>
                <span className={styles.bannerMeta}>{lead.queryMessage}</span>
                <span className={styles.bannerMeta}>
                  Raised by {lead.queryRaisedByName ?? 'you'}
                  {lead.queryRaisedAt && ` on ${new Date(lead.queryRaisedAt).toLocaleString()}`}
                </span>
              </div>
            )}

            {reviewError && <ErrorState message={reviewError} />}

            {isReviewable && (
              <div className={styles.reviewActions}>
                <Button onClick={() => setReviewAction('approve')}>Approve</Button>
                <Button variant="secondary" onClick={() => setReviewAction('query')}>
                  Raise Query
                </Button>
                <Button variant="danger" onClick={() => setReviewAction('reject')}>
                  Reject
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <h2 className={styles.sectionTitle}>Customer information</h2>
            <div className={styles.fieldGrid}>
              <Field label="Name">{customer?.fullName ?? '—'}</Field>
              <Field label="Email">{customer?.email ?? '—'}</Field>
              <Field label="Phone">{customer?.phone ?? '—'}</Field>
              <Field label="PAN">{profile?.panNumber ?? '—'}</Field>
              <Field label="Aadhaar">
                {profile?.aadhaarLast4 ? `•••• ${profile.aadhaarLast4}` : '—'}
              </Field>
              <Field label="KYC status">{profile?.kycStatus ?? '—'}</Field>
              <Field label="City">{profile?.city ?? '—'}</Field>
              <Field label="State">{profile?.state ?? '—'}</Field>
              <Field label="Employment">{profile?.employmentStatus ?? '—'}</Field>
              <Field label="Monthly income">{profile?.monthlyIncome ?? '—'}</Field>
            </div>
          </Card>

          <Card>
            <h2 className={styles.sectionTitle}>Documents</h2>
            <DocumentManagementCenter customerId={lead.applicantId} />
          </Card>
        </div>

        <div className={styles.column}>
          <Card>
            <h2 className={styles.sectionTitle}>Internal notes</h2>
            <textarea
              className={styles.notesTextarea}
              value={notes.notes}
              disabled={notes.status === 'locked'}
              placeholder="Private notes for this lead — only you can see these."
              onChange={(event) => notes.handleChange(event.target.value)}
            />
            <div
              className={`${styles.notesStatus} ${
                notes.status === 'error' || notes.status === 'locked' ? styles.notesStatusError : ''
              }`}
            >
              {notes.status === 'saving' && 'Saving…'}
              {notes.status === 'saved' &&
                notes.lastSavedAt &&
                `Saved at ${new Date(notes.lastSavedAt).toLocaleTimeString()}`}
              {notes.status === 'error' && 'Could not save — check your connection.'}
              {notes.status === 'locked' &&
                'This lead is no longer assigned to you. Further changes will not be saved.'}
            </div>
          </Card>

          <Card>
            <h2 className={styles.sectionTitle}>Timeline &amp; activity history</h2>
            <div className={styles.timeline}>
              {timeline.map((entry) => (
                <div key={entry.key} className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <div className={styles.timelineBody}>
                    <span className={styles.timelineTitle}>{entry.title}</span>
                    <span className={styles.timelineMeta}>
                      {entry.meta} · {new Date(entry.at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {reviewAction && (
        <ReviewModal
          action={reviewAction}
          busy={reviewBusy}
          onSubmit={(payload) => void handleReviewSubmit(payload)}
          onClose={() => setReviewAction(null)}
        />
      )}
    </PageContainer>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{children}</span>
    </div>
  );
}

function isForbidden(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 403
  );
}
