import type { LeadAssignmentHistoryEntry, LeadSummary } from '@loan-manager/shared-types';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageContainer } from '../../components/ui/PageContainer';

import { DocumentViewerModal } from './DocumentViewerModal';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from './lead-status-meta';
import styles from './LeadDetailPage.module.css';
import { useAutosaveNotes } from './useAutosaveNotes';
import {
  fetchCustomerDocuments,
  fetchCustomerProfile,
  fetchCustomerSummary,
  fetchLead,
  fetchLeadHistory,
  type CustomerProfile,
  type CustomerSummary,
  type DocumentsOverview,
} from './workspace-api';

interface FlatDocument {
  id: string;
  typeLabel: string;
  originalFileName: string;
  mimeType: string | null;
  uploadedAt: string;
}

interface TimelineEntry {
  key: string;
  title: string;
  meta: string;
  at: string;
}

function flattenDocuments(overview: DocumentsOverview): FlatDocument[] {
  const documents: FlatDocument[] = [];
  for (const category of overview.categories) {
    for (const type of category.types) {
      for (const slot of type.slots) {
        if (slot.isUploaded && slot.document) {
          documents.push({
            id: slot.document.id,
            typeLabel: type.label,
            originalFileName: slot.document.originalFileName,
            mimeType: slot.document.mimeType,
            uploadedAt: slot.document.uploadedAt,
          });
        }
      }
    }
  }
  return documents;
}

function buildTimeline(lead: LeadSummary, history: LeadAssignmentHistoryEntry[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { key: 'submitted', title: 'Application submitted', meta: 'By the customer', at: lead.submittedAt },
  ];

  for (const entry of history) {
    const actionLabel =
      entry.action === 'assign' ? 'Assigned' : entry.action === 'reassign' ? 'Reassigned' : 'Transferred';
    entries.push({
      key: entry.id,
      title: `${actionLabel} to ${entry.newEmployeeName ?? 'an employee'}`,
      meta: `By ${entry.assignedByName ?? 'an administrator'}${
        entry.previousEmployeeName ? ` · previously ${entry.previousEmployeeName}` : ''
      }`,
      at: entry.createdAt,
    });
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/**
 * Lead Detail — Customer Information, Document Viewer, Timeline /
 * Activity History, and autosaved Internal Notes, all reusing
 * existing endpoints. Lead Locking: the underlying APIs already
 * enforce that only the assigned employee can read/write this lead
 * (403 otherwise) — this page just surfaces that as a clear locked
 * state instead of a raw error.
 */
export function LeadDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<LeadSummary | null>(null);
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [documents, setDocuments] = useState<FlatDocument[]>([]);
  const [history, setHistory] = useState<LeadAssignmentHistoryEntry[]>([]);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState<FlatDocument | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      setLocked(false);
      try {
        const leadData = await fetchLead(id!);
        if (cancelled) return;
        setLead(leadData);

        const [customerData, profileData, documentsData, historyData] = await Promise.all([
          fetchCustomerSummary(leadData.applicantId),
          fetchCustomerProfile(leadData.applicantId).catch(() => null),
          fetchCustomerDocuments(leadData.applicantId).catch(() => ({ categories: [] })),
          fetchLeadHistory(id!).catch(() => []),
        ]);
        if (cancelled) return;
        setCustomer(customerData);
        setProfile(profileData);
        setDocuments(flattenDocuments(documentsData));
        setHistory(historyData);
      } catch (err) {
        if (cancelled) return;
        if (isForbidden(err)) {
          setLocked(true);
        } else {
          setError('Could not load this lead.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const notes = useAutosaveNotes(id ?? '', lead?.internalNotes ?? null);

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
            {documents.length === 0 ? (
              <EmptyState message="No documents uploaded yet." />
            ) : (
              <div className={styles.docList}>
                {documents.map((doc) => (
                  <div key={doc.id} className={styles.docRow}>
                    <div className={styles.docMeta}>
                      <span className={styles.docName}>{doc.originalFileName}</span>
                      <span className={styles.docType}>{doc.typeLabel}</span>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setViewingDocument(doc)}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
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

      {viewingDocument && (
        <DocumentViewerModal
          documentId={viewingDocument.id}
          fileName={viewingDocument.originalFileName}
          mimeType={viewingDocument.mimeType}
          onClose={() => setViewingDocument(null)}
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
