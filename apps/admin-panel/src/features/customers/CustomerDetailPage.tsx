import type { AuditTrailEntry, CustomerOverview, LeadSummary } from '@loan-manager/shared-types';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { PageContainer } from '../../components/ui/PageContainer';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { describeAuditAction } from '../../lib/audit-trail-meta';
import { formatInr } from '../../lib/currency';
import { DocumentManagementCenter } from '../documents/DocumentManagementCenter';
import { formatDateTime, getDisplayStatus, REVIEWABLE_STATUSES } from '../workspace/lead-status-meta';

import { buildCustomerTimeline } from './customer-timeline';
import styles from './CustomerDetailPage.module.css';
import { downloadAllCustomerDocuments, fetchCustomerAuditTrail, fetchCustomerOverview } from './customers-api';

const ACTIVE_STATUSES: LeadSummary['status'][] = ['submitted', 'under_review', 'query_raised'];

function initialsFor(fullName: string | null): string {
  const initials = (fullName ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return initials || '?';
}

/**
 * Customer 360 — everything about one customer in one screen: profile,
 * summary KPIs, every application, a unified Timeline, the Audit
 * Trail, embedded Documents (with the mandatory Download All ZIP/PDF
 * export), and read-only Internal Notes. See `CustomerOverviewService`
 * (backend) for how the single `overview` fetch is assembled, and
 * `customer-timeline.ts` for how the Timeline is derived client-side
 * from data already on this page — no extra backend call.
 */
export function CustomerDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<CustomerOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[] | null>(null);
  const [auditTrailError, setAuditTrailError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    if (!id) return;
    setOverviewError(null);
    try {
      setOverview(await fetchCustomerOverview(id));
    } catch {
      setOverviewError('Could not load this customer.');
    }
  }, [id]);

  const loadAuditTrail = useCallback(async () => {
    if (!id) return;
    setAuditTrailError(null);
    try {
      setAuditTrail(await fetchCustomerAuditTrail(id));
    } catch {
      setAuditTrailError('Could not load the audit trail.');
    }
  }, [id]);

  useEffect(() => {
    void loadOverview();
    void loadAuditTrail();
  }, [loadOverview, loadAuditTrail]);

  const timeline = useMemo(
    () => (overview && auditTrail ? buildCustomerTimeline(overview.applications, overview.documents, auditTrail) : null),
    [overview, auditTrail],
  );

  async function handleDownloadAll(): Promise<void> {
    if (!id) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadAllCustomerDocuments(id);
    } catch {
      setDownloadError('Could not generate the download. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  const applicationColumns: DataTableColumn<LeadSummary>[] = [
    { key: 'caseNumber', header: 'Case Number', sortValue: (row) => row.caseNumber, render: (row) => row.caseNumber },
    { key: 'category', header: 'Loan Type', render: (row) => row.categoryId ?? '—' },
    {
      key: 'amount',
      header: 'Loan Amount',
      align: 'right',
      sortValue: (row) => Number(row.requestedAmount),
      render: (row) => formatInr(row.requestedAmount),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge {...getDisplayStatus(row)} />,
    },
    {
      key: 'submittedAt',
      header: 'Created Date',
      sortValue: (row) => new Date(row.submittedAt).getTime(),
      render: (row) => formatDateTime(row.submittedAt),
    },
    { key: 'assignedTo', header: 'Assigned Employee', render: (row) => row.assignedToName ?? 'Unassigned' },
  ];

  if (overviewError) {
    return (
      <PageContainer title="Customer">
        <ErrorState message={overviewError} onRetry={() => void loadOverview()} />
      </PageContainer>
    );
  }

  if (!overview) {
    return (
      <PageContainer title="Customer">
        <LoadingState message="Loading customer…" />
      </PageContainer>
    );
  }

  const applications = overview.applications;
  // Most recently submitted application (already the array's own order —
  // see LoanApplicationRepository.findAllByApplicantWithRelations) stands
  // in for "the customer's current case" wherever the header needs one
  // fact (assigned employee, current status) but the customer may have
  // several applications at once.
  const primaryApplication = applications[0] as LeadSummary | undefined;
  const activeCount = applications.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;
  const pendingReviewCount = applications.filter((a) => REVIEWABLE_STATUSES.includes(a.status)).length;
  const missingDocumentsCount = overview.documents.filter((d) => d.verificationStatus === 'reupload_requested').length;
  const lastActivityAt = timeline?.[0]?.at ?? null;
  const notedApplications = applications.filter((a) => a.internalNotes);

  return (
    <PageContainer
      title={overview.fullName ?? 'Customer'}
      description={`Customer ID ${overview.id}`}
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void loadOverview();
            void loadAuditTrail();
          }}
        >
          Refresh
        </Button>
      }
    >
      <Card>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            {overview.photoUrl ? (
              <img src={overview.photoUrl} alt="" className={styles.avatarImage} />
            ) : (
              initialsFor(overview.fullName)
            )}
          </div>
          <div>
            <h1 className={styles.profileName}>{overview.fullName ?? 'Unknown customer'}</h1>
            <span className={overview.isActive ? styles.statusActive : styles.statusInactive}>
              {overview.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className={styles.fieldGrid}>
          <Field label="Customer ID">{overview.id}</Field>
          <Field label="Mobile Number">{overview.phone ?? '—'}</Field>
          <Field label="Email">{overview.email ?? '—'}</Field>
          <Field label="Address">
            {[overview.profile?.addressLine1, overview.profile?.city, overview.profile?.state]
              .filter(Boolean)
              .join(', ') || '—'}
          </Field>
          <Field label="PAN">{overview.profile?.panNumber ?? '—'}</Field>
          <Field label="Aadhaar">
            {overview.profile?.aadhaarLast4 ? `•••• ${overview.profile.aadhaarLast4}` : '—'}
          </Field>
          <Field label="Application(s)">
            {applications.length > 0 ? applications.map((a) => a.caseNumber).join(', ') : '—'}
          </Field>
          <Field label="Assigned Employee">{primaryApplication?.assignedToName ?? 'Unassigned'}</Field>
          <Field label="Current Status">
            {primaryApplication ? getDisplayStatus(primaryApplication).label : 'No applications yet'}
          </Field>
          <Field label="Verification Status">
            {(overview.profile?.kycStatus ?? 'not_submitted').replace(/_/g, ' ')}
          </Field>
          <Field label="Date Created">{formatDateTime(overview.createdAt)}</Field>
          <Field label="Last Updated">{formatDateTime(overview.updatedAt)}</Field>
        </div>
      </Card>

      <div className={styles.statGrid}>
        <StatCard label="Active Applications" value={String(activeCount)} icon="document" tint="indigo" />
        <StatCard label="Approved Applications" value={String(approvedCount)} icon="checkCircle" tint="green" />
        <StatCard label="Rejected Applications" value={String(rejectedCount)} icon="alertTriangle" tint="amber" />
        <StatCard label="Pending Reviews" value={String(pendingReviewCount)} icon="hourglass" tint="electric" />
        <StatCard label="Uploaded Documents" value={String(overview.documents.length)} icon="upload" tint="indigo" />
        <StatCard label="Missing Documents" value={String(missingDocumentsCount)} icon="alertTriangle" tint="amber" />
        <StatCard
          label="Last Activity"
          value={lastActivityAt ? formatDateTime(lastActivityAt) : 'No activity yet'}
          icon="clock"
          tint="electric"
        />
        <StatCard label="Assigned Officer" value={primaryApplication?.assignedToName ?? 'Unassigned'} icon="user" tint="green" />
      </div>

      <div className={styles.twoColumnRow}>
        <Card>
          <h2 className={styles.sectionTitle}>Timeline</h2>
          {!timeline ? (
            <LoadingState message="Loading timeline…" />
          ) : timeline.length === 0 ? (
            <EmptyState message="No activity recorded yet." />
          ) : (
            <div className={styles.timeline}>
              {timeline.map((entry) => (
                <div key={entry.id} className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <div className={styles.timelineBody}>
                    <span className={styles.timelineTitle}>{entry.title}</span>
                    <span className={styles.timelineMeta}>
                      {entry.meta ? `${entry.meta} · ` : ''}
                      {formatDateTime(entry.at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className={styles.sectionTitle}>Audit Trail</h2>
          {auditTrailError ? (
            <ErrorState message={auditTrailError} onRetry={() => void loadAuditTrail()} />
          ) : !auditTrail ? (
            <LoadingState message="Loading audit trail…" />
          ) : auditTrail.length === 0 ? (
            <EmptyState message="No audit events recorded yet." />
          ) : (
            <div className={styles.timeline}>
              {auditTrail.map((entry) => (
                <div key={entry.id} className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <div className={styles.timelineBody}>
                    <span className={styles.timelineTitle}>{describeAuditAction(entry.action)}</span>
                    <span className={styles.timelineMeta}>
                      By {entry.actorName ?? 'System'} · {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Application History</h2>
        <DataTable
          columns={applicationColumns}
          data={applications}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/applications/${row.id}`, { state: { from: `/customers/${overview.id}` } })}
          emptyMessage="No applications yet."
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Documents</h2>
          <Button onClick={() => void handleDownloadAll()} disabled={downloading || overview.documents.length === 0}>
            {downloading ? 'Preparing…' : 'Download All Documents'}
          </Button>
        </div>
        {downloadError && <ErrorState message={downloadError} onRetry={() => setDownloadError(null)} />}
        <Card noPadding>
          <DocumentManagementCenter customerId={overview.id} />
        </Card>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Internal Notes</h2>
        {notedApplications.length === 0 ? (
          <EmptyState message="No internal notes yet." />
        ) : (
          <Card noPadding>
            <div className={styles.notesList}>
              {notedApplications.map((application) => (
                <div key={application.id} className={styles.noteRow}>
                  <span className={styles.noteCase}>{application.caseNumber}</span>
                  <p className={styles.noteBody}>{application.internalNotes}</p>
                  {application.internalNotesUpdatedAt && (
                    <span className={styles.noteMeta}>
                      Updated {formatDateTime(application.internalNotesUpdatedAt)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
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
