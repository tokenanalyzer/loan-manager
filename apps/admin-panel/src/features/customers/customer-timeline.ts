import type { AuditTrailEntry, CustomerOverviewDocument, LeadSummary } from '@loan-manager/shared-types';

export interface CustomerTimelineEntry {
  id: string;
  title: string;
  meta: string;
  at: string;
}

/**
 * Customer 360's unified Timeline — merges events already present in
 * the overview response (application lifecycle, document uploads/
 * verification) with the customer-scoped Audit Trail's assignment
 * events, into one chronological feed. No new backend call: everything
 * here is already fetched for the page's other sections.
 *
 * "Document Replaced" is inferred from `currentVersionNumber > 1` using
 * only the *current* version's upload timestamp — the overview
 * response doesn't carry full per-document version history (that would
 * be an N+1 fetch per document just for this summary feed); the
 * complete replace history for one document is already available via
 * its own "Audit" modal in the embedded Document Management Center.
 */
export function buildCustomerTimeline(
  applications: LeadSummary[],
  documents: CustomerOverviewDocument[],
  auditTrail: AuditTrailEntry[],
): CustomerTimelineEntry[] {
  const entries: CustomerTimelineEntry[] = [];

  for (const application of applications) {
    entries.push({
      id: `submitted-${application.id}`,
      title: `Application ${application.caseNumber} submitted`,
      meta: [application.categoryId, application.requestedAmount].filter(Boolean).join(' · '),
      at: application.submittedAt,
    });

    if (application.reviewedAt) {
      const title =
        application.status === 'approved'
          ? `Application ${application.caseNumber} approved`
          : application.status === 'rejected'
            ? `Application ${application.caseNumber} rejected`
            : `Application ${application.caseNumber} reviewed`;
      entries.push({
        id: `reviewed-${application.id}`,
        title,
        meta: application.reviewedByName ? `By ${application.reviewedByName}` : '',
        at: application.reviewedAt,
      });
    }

    if (application.queryRaisedAt) {
      entries.push({
        id: `query-raised-${application.id}`,
        title: `Query raised on ${application.caseNumber}`,
        meta: application.queryRaisedByName ? `By ${application.queryRaisedByName}` : '',
        at: application.queryRaisedAt,
      });
    }

    if (application.queryRespondedAt) {
      entries.push({
        id: `query-responded-${application.id}`,
        title: `Customer responded to query on ${application.caseNumber}`,
        meta: '',
        at: application.queryRespondedAt,
      });
    }

    if (application.loan?.disbursedAt) {
      entries.push({
        id: `disbursed-${application.id}`,
        title: `Loan disbursed for ${application.caseNumber}`,
        meta: application.loan.disbursedByName ? `By ${application.loan.disbursedByName}` : '',
        at: application.loan.disbursedAt,
      });
    }
  }

  for (const document of documents) {
    const label = document.typeLabel ?? 'Document';
    entries.push({
      id: `doc-uploaded-${document.id}`,
      title:
        document.currentVersionNumber && document.currentVersionNumber > 1
          ? `${label} replaced`
          : `${label} uploaded`,
      meta: document.uploadedByName ? `By ${document.uploadedByName}` : '',
      at: document.uploadedAt,
    });

    if (document.verifiedAt) {
      entries.push({
        id: `doc-verified-${document.id}`,
        title: `${label} verification completed`,
        meta: [document.verificationStatus, document.verifiedByName ? `By ${document.verifiedByName}` : '']
          .filter(Boolean)
          .join(' · '),
        at: document.verifiedAt,
      });
    }
  }

  const ASSIGNMENT_TITLE: Record<string, string> = {
    assign: 'Assigned',
    reassign: 'Reassigned',
    transfer: 'Transferred',
  };
  for (const entry of auditTrail) {
    if (entry.source === 'assignment') {
      entries.push({
        id: `assignment-${entry.id}`,
        title: ASSIGNMENT_TITLE[entry.action] ?? 'Assignment changed',
        meta: entry.actorName ? `By ${entry.actorName}` : '',
        at: entry.createdAt,
      });
    }
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
