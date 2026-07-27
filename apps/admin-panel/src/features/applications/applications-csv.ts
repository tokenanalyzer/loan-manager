import type { LeadSummary } from '@loan-manager/shared-types';

import { formatInr } from '../../lib/currency';
import { triggerDownload } from '../documents/documents-api';
import { getDisplayStatus } from '../workspace/lead-status-meta';

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Client-generated CSV export — real data already loaded on screen, no backend export endpoint needed. */
export function exportApplicationsCsv(leads: LeadSummary[]): void {
  const header = ['Case Number', 'Applicant', 'Category', 'Amount', 'Status', 'Assigned To', 'Submitted'];
  const rows = leads.map((lead) => [
    lead.caseNumber,
    lead.applicantName ?? lead.applicantId,
    lead.categoryId ?? '',
    formatInr(lead.requestedAmount),
    getDisplayStatus(lead).label,
    lead.assignedToName ?? 'Unassigned',
    new Date(lead.submittedAt).toISOString(),
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `applications-export-${new Date().toISOString().slice(0, 10)}.csv`);
}
