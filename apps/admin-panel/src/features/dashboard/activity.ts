import type { LeadSummary } from '@loan-manager/shared-types';

/**
 * Recent Activity — derived entirely client-side from the same
 * `GET /v1/loan-applications` response the dashboard's widgets already
 * fetch (admins see every lead). There is no dedicated activity/audit
 * feed endpoint across the whole platform (only per-lead assignment
 * history and per-document verification audit, both scoped to a single
 * id), so this reuses the lifecycle timestamps every `LeadSummary`
 * already carries — submitted, assigned, query raised/responded,
 * reviewed — rather than adding a new backend aggregate endpoint.
 */
export interface ActivityEvent {
  id: string;
  leadId: string;
  timestamp: string;
  description: string;
}

export function deriveRecentActivity(leads: LeadSummary[], limit = 10): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const lead of leads) {
    const applicant = lead.applicantName ?? `Applicant ${lead.applicantId.slice(0, 8)}`;

    events.push({
      id: `${lead.id}-submitted`,
      leadId: lead.id,
      timestamp: lead.submittedAt,
      description: `${applicant} submitted a new application.`,
    });

    if (lead.assignedAt) {
      events.push({
        id: `${lead.id}-assigned`,
        leadId: lead.id,
        timestamp: lead.assignedAt,
        description: `${applicant}'s lead assigned to ${lead.assignedToName ?? 'an employee'}.`,
      });
    }

    if (lead.queryRaisedAt) {
      events.push({
        id: `${lead.id}-query-raised`,
        leadId: lead.id,
        timestamp: lead.queryRaisedAt,
        description: `${lead.queryRaisedByName ?? 'An employee'} raised a query on ${applicant}'s lead.`,
      });
    }

    if (lead.queryRespondedAt) {
      events.push({
        id: `${lead.id}-query-responded`,
        leadId: lead.id,
        timestamp: lead.queryRespondedAt,
        description: `${applicant} responded to a query.`,
      });
    }

    if (lead.reviewedAt && (lead.status === 'approved' || lead.status === 'rejected')) {
      const verb = lead.status === 'approved' ? 'approved' : 'rejected';
      events.push({
        id: `${lead.id}-reviewed`,
        leadId: lead.id,
        timestamp: lead.reviewedAt,
        description: `${lead.reviewedByName ?? 'A reviewer'} ${verb} ${applicant}'s application.`,
      });
    }
  }

  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
