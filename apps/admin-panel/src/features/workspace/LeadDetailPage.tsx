import type {
  AuditTrailEntry,
  BlockingRequiredDocument,
  LeadAssignmentHistoryEntry,
  LeadSummary,
} from '@loan-manager/shared-types';
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageContainer } from '../../components/ui/PageContainer';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../core/auth-context';
import { describeAuditAction } from '../../lib/audit-trail-meta';
import { DocumentManagementCenter } from '../documents/DocumentManagementCenter';
import { createFollowUp } from '../employee/follow-ups-api';
import { LogFollowUpModal } from '../employee/LogFollowUpModal';

import { DisburseModal } from './DisburseModal';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, REVIEWABLE_STATUSES } from './lead-status-meta';
import styles from './LeadDetailPage.module.css';
import { ReviewModal } from './ReviewModal';
import { useAutosaveNotes } from './useAutosaveNotes';
import {
  disburseLoan,
  fetchAuditTrail,
  fetchCustomerProfile,
  fetchCustomerSummary,
  fetchLead,
  fetchLeadHistory,
  reviewLead,
  type CustomerProfile,
  type CustomerSummary,
  type DisburseLoanPayload,
  type ReviewLeadPayload,
} from './workspace-api';

/** Display labels only — the backend decides which documents actually block approval (LoanApplicationsService.review); this just renders whatever it returns. */
const BLOCKING_REASON_LABEL: Record<BlockingRequiredDocument['reason'], string> = {
  missing: 'Not uploaded',
  pending: 'Awaiting verification',
  rejected: 'Rejected',
  reupload_requested: 'Re-upload requested',
};

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
 * Activity History, autosaved Internal Notes, and the review decision
 * (Approve / Reject / Raise Query), all reusing existing endpoints.
 * Reachable at both `/employee/my-leads/:id` (employee, Employee CRM's
 * own namespace) and `/leads/:id` (admin) — the backend already
 * permits both roles on every endpoint this page calls, so this
 * component is shared as-is; only the "back" destination and the
 * Customer 360 link are role-aware, since the two roles have separate
 * namespaces to return to. Lead Locking: the underlying APIs enforce
 * that an employee may only read/write leads assigned to them (403
 * otherwise, admin is never restricted this way) — this page surfaces
 * that as a clear locked state instead of a raw error.
 */
const BACK_LABELS: Record<string, string> = {
  '/leads': 'Back to Leads',
  '/employee/my-leads': 'Back to My Leads',
  '/applications': 'Back to Applications',
};

export function LeadDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile: authProfile } = useAuth();
  const isEmployee = authProfile?.role === 'employee';
  const toast = useToast();
  // Reachable from more than one list now (`/leads`, `/employee/my-leads`,
  // `/applications`) — the linking page passes `state: { from }` so
  // "back" returns where the admin actually came from, falling back to
  // the original role-based default when a route links in directly
  // (e.g. a bookmark) without that state.
  const backPath = (location.state as { from?: string } | null)?.from
    ?? (authProfile?.role === 'admin' ? '/leads' : '/employee/my-leads');
  const backLabel = BACK_LABELS[backPath] ?? 'Back';

  const [lead, setLead] = useState<LeadSummary | null>(null);
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [history, setHistory] = useState<LeadAssignmentHistoryEntry[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'query' | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [blockingDocuments, setBlockingDocuments] = useState<BlockingRequiredDocument[] | null>(null);
  const [disbursing, setDisbursing] = useState(false);
  const [disburseBusy, setDisburseBusy] = useState(false);
  const [disburseError, setDisburseError] = useState<string | null>(null);
  const [loggingFollowUp, setLoggingFollowUp] = useState(false);
  const [followUpBusy, setFollowUpBusy] = useState(false);

  async function load(): Promise<void> {
    if (!id) return;
    setLoading(true);
    setError(null);
    setLocked(false);
    try {
      const leadData = await fetchLead(id);
      setLead(leadData);

      const [customerData, profileData, historyData, auditTrailData] = await Promise.all([
        fetchCustomerSummary(leadData.applicantId),
        fetchCustomerProfile(leadData.applicantId).catch(() => null),
        fetchLeadHistory(id).catch(() => []),
        fetchAuditTrail(id).catch(() => []),
      ]);
      setCustomer(customerData);
      setProfile(profileData);
      setHistory(historyData);
      setAuditTrail(auditTrailData);
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
    setBlockingDocuments(null);
    try {
      const updated = await reviewLead(id, payload);
      setLead(updated);
      setReviewAction(null);
      void load(); // refresh history/timeline alongside the new status
    } catch (err) {
      // The approval validation gate (LoanApplicationsService.review) returns
      // a structured { message, blockingDocuments } body on a 409 — surface
      // both as-is; this page never decides which documents block approval,
      // only displays what the backend already decided.
      const data = (
        err as { response?: { data?: { message?: string; blockingDocuments?: BlockingRequiredDocument[] } } }
      ).response?.data;
      setReviewError(data?.message ?? 'That action failed. Please try again.');
      setBlockingDocuments(data?.blockingDocuments ?? null);
    } finally {
      setReviewBusy(false);
    }
  }

  async function handleDisburseSubmit(payload: DisburseLoanPayload): Promise<void> {
    if (!id) return;
    setDisburseBusy(true);
    setDisburseError(null);
    try {
      const updated = await disburseLoan(id, payload);
      setLead(updated);
      setDisbursing(false);
      void load();
    } catch (err) {
      const data = (err as { response?: { data?: { message?: string } } }).response?.data;
      setDisburseError(data?.message ?? 'That action failed. Please try again.');
    } finally {
      setDisburseBusy(false);
    }
  }

  async function handleLogFollowUpSubmit(payload: { note: string; dueAt: string }): Promise<void> {
    if (!id) return;
    setFollowUpBusy(true);
    try {
      await createFollowUp({ loanApplicationId: id, note: payload.note, dueAt: payload.dueAt });
      toast.success('Follow-up logged.');
      setLoggingFollowUp(false);
    } catch {
      toast.error('Could not log the follow-up. Please try again.');
    } finally {
      setFollowUpBusy(false);
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
          action={<Button onClick={() => navigate(backPath)}>{backLabel}</Button>}
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
      description={`${lead.caseNumber} · ${lead.requestedAmount} · ${lead.requestedTermMonths} months`}
      actions={
        <Button variant="secondary" onClick={() => navigate(backPath)}>
          {backLabel}
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

            {lead.categoryId === 'lap' && (
              <>
                <h2 className={styles.sectionTitle}>Property details</h2>
                <div className={styles.fieldGrid}>
                  <Field label="Property type">{lead.propertyType ?? '—'}</Field>
                  <Field label="Ownership">{lead.propertyOwnership ?? '—'}</Field>
                  <Field label="Address">{lead.propertyAddress ?? '—'}</Field>
                  <Field label="Value">{lead.propertyValue ?? '—'}</Field>
                  <Field label="Existing loan on property">
                    {lead.hasExistingLoanOnProperty ? 'Yes' : 'No'}
                  </Field>
                  {lead.hasExistingLoanOnProperty && (
                    <Field label="Outstanding amount">
                      {lead.existingLoanOutstandingAmount ?? '—'}
                    </Field>
                  )}
                </div>
              </>
            )}

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

            {lead.waitingForCustomer && (
              <div className={styles.banner}>
                <span className={styles.bannerTitle}>Waiting for Customer — document re-upload</span>
                <span className={styles.bannerMeta}>
                  A document was sent back for re-upload
                  {lead.waitingForCustomerSince &&
                    ` on ${new Date(lead.waitingForCustomerSince).toLocaleString()}`}
                  . This is independent of the lead&rsquo;s review status — see the Documents section
                  below.
                </span>
              </div>
            )}

            {reviewError && (
              <>
                <ErrorState message={reviewError} />
                {blockingDocuments && blockingDocuments.length > 0 && (
                  <ul className={styles.blockingList}>
                    {blockingDocuments.map((doc) => (
                      <li key={doc.code}>
                        {doc.label} — {BLOCKING_REASON_LABEL[doc.reason]}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

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

            {lead.status === 'approved' && lead.loan?.status === 'active' && (
              <div className={styles.banner}>
                <span className={styles.bannerTitle}>Loan disbursed</span>
                <span className={styles.bannerMeta}>
                  {lead.loan.loanNumber} · {lead.loan.disbursementReference ?? 'no reference on file'}
                </span>
                <span className={styles.bannerMeta}>
                  {lead.loan.disbursedByName ? `By ${lead.loan.disbursedByName}` : 'Disbursed'}
                  {lead.loan.disbursedAt && ` on ${new Date(lead.loan.disbursedAt).toLocaleString()}`}
                </span>
              </div>
            )}

            {disburseError && <ErrorState message={disburseError} />}

            {lead.status === 'approved' && lead.loan?.status === 'pending' && (
              <div className={styles.reviewActions}>
                <Button onClick={() => setDisbursing(true)}>Disburse Loan</Button>
              </div>
            )}
          </Card>

          <Card>
            <div className={styles.customerInfoHeader}>
              <h2 className={styles.sectionTitle}>Customer information</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigate(
                    isEmployee ? `/employee/my-customers/${lead.applicantId}` : `/customers/${lead.applicantId}`,
                  )
                }
              >
                View Customer 360
              </Button>
            </div>
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
              <Field label="Bank account">
                {profile?.bankAccountLast4 ? `•••• ${profile.bankAccountLast4}` : '—'}
              </Field>
              <Field label="IFSC">{profile?.bankIfscCode ?? '—'}</Field>
              <Field label="Account holder">{profile?.bankAccountHolderName ?? '—'}</Field>
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

          {isEmployee && (
            <Card>
              <h2 className={styles.sectionTitle}>Follow-ups</h2>
              <p style={{ margin: '0 0 12px', color: 'var(--color-text-secondary)' }}>
                Log a call or touchpoint and when you&apos;ll follow up next.
              </p>
              <Button size="sm" onClick={() => setLoggingFollowUp(true)}>
                Log follow-up
              </Button>
            </Card>
          )}

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

          <Card>
            <h2 className={styles.sectionTitle}>Audit trail</h2>
            {auditTrail.length === 0 ? (
              <EmptyState message="No audit events recorded yet." />
            ) : (
              <div className={styles.timeline}>
                {auditTrail.map((entry) => (
                  <div key={entry.id} className={styles.timelineItem}>
                    <span className={styles.timelineDot} />
                    <div className={styles.timelineBody}>
                      <span className={styles.timelineTitle}>{describeAuditAction(entry.action)}</span>
                      <span className={styles.timelineMeta}>
                        By {entry.actorName ?? 'System'} · {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {disbursing && lead.loan && (
        <DisburseModal
          principalAmount={lead.loan.principalAmount}
          bankAccountLast4={profile?.bankAccountLast4}
          bankIfscCode={profile?.bankIfscCode}
          busy={disburseBusy}
          onSubmit={(payload) => void handleDisburseSubmit(payload)}
          onClose={() => setDisbursing(false)}
        />
      )}

      {loggingFollowUp && (
        <LogFollowUpModal
          busy={followUpBusy}
          onSubmit={(payload) => void handleLogFollowUpSubmit(payload)}
          onClose={() => setLoggingFollowUp(false)}
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
