import type { DocumentCenterEntry, EmployeeWorkload, LeadSummary } from '@loan-manager/shared-types';

import type { DonutChartSegment } from '../../components/charts/DonutChart';
import { CATEGORY_LABEL, STATUS_COLOR, STATUS_LABEL } from '../documents/document-status-meta';

/**
 * Reports & Analytics aggregation — all derived client-side from data
 * already fetchable via existing endpoints (`fetchAllLeads`,
 * `fetchEmployeesWithWorkload`, `fetchAllDocuments`), same discipline as
 * `dashboard-data.ts` (reused directly for Monthly Applications and
 * Application Status — not reimplemented here). No backend reporting
 * endpoint exists or is needed at current data volumes.
 */

/** Approval/rejection rate over every loaded application — real counts, not a fabricated sample. */
export function computeApprovalRejectionRates(
  leads: LeadSummary[],
): { approved: number; rejected: number; total: number; approvalRate: number; rejectionRate: number } {
  const total = leads.length;
  const approved = leads.filter((lead) => lead.status === 'approved').length;
  const rejected = leads.filter((lead) => lead.status === 'rejected').length;
  return {
    approved,
    rejected,
    total,
    approvalRate: total > 0 ? (approved / total) * 100 : 0,
    rejectionRate: total > 0 ? (rejected / total) * 100 : 0,
  };
}

export interface EmployeePerformanceRow {
  employeeId: string;
  employeeName: string;
  assigned: number;
  approved: number;
  rejected: number;
  disbursed: number;
  /** `null` when nothing is assigned yet — a rate against zero isn't a real rate. */
  approvalRate: number | null;
}

/**
 * Per-employee status breakdown, joining the workload roster (source of
 * truth for who's an active employee) with every application's
 * `assignedToId` — cross-referencing two already-loaded lists rather
 * than a new backend aggregate. Employees with zero assigned leads are
 * still included (from the roster) so "no work yet" reads honestly
 * rather than being silently omitted.
 */
export function computeEmployeePerformance(
  leads: LeadSummary[],
  employees: EmployeeWorkload[],
): EmployeePerformanceRow[] {
  const byEmployee = new Map<string, EmployeePerformanceRow>();

  for (const employee of employees) {
    byEmployee.set(employee.id, {
      employeeId: employee.id,
      employeeName: employee.fullName ?? employee.employeeCode ?? 'Unknown',
      assigned: 0,
      approved: 0,
      rejected: 0,
      disbursed: 0,
      approvalRate: null,
    });
  }

  for (const lead of leads) {
    if (!lead.assignedToId) continue;
    let row = byEmployee.get(lead.assignedToId);
    if (!row) {
      row = {
        employeeId: lead.assignedToId,
        employeeName: lead.assignedToName ?? 'Unknown',
        assigned: 0,
        approved: 0,
        rejected: 0,
        disbursed: 0,
        approvalRate: null,
      };
      byEmployee.set(lead.assignedToId, row);
    }
    row.assigned += 1;
    if (lead.status === 'approved') row.approved += 1;
    if (lead.status === 'rejected') row.rejected += 1;
    if (lead.loan?.status === 'active') row.disbursed += 1;
  }

  for (const row of byEmployee.values()) {
    row.approvalRate = row.assigned > 0 ? (row.approved / row.assigned) * 100 : null;
  }

  return Array.from(byEmployee.values()).sort((a, b) => b.assigned - a.assigned);
}

/** Document counts by verification status — reuses the Document Center's own label/color source. */
export function computeDocumentStatusDistribution(documents: DocumentCenterEntry[]): DonutChartSegment[] {
  const counts = new Map<string, number>();
  for (const doc of documents) {
    counts.set(doc.verificationStatus, (counts.get(doc.verificationStatus) ?? 0) + 1);
  }
  return Object.entries(STATUS_LABEL).map(([status, label]) => ({
    label,
    value: counts.get(status) ?? 0,
    color: STATUS_COLOR[status as keyof typeof STATUS_COLOR],
  }));
}

/** Document counts by category — real `DocumentCategory` catalog values, "Uncategorized" only for genuinely null categories. */
export function computeDocumentCategoryBreakdown(
  documents: DocumentCenterEntry[],
): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const doc of documents) {
    const key = doc.category ?? 'uncategorized';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, value]) => ({
      label: category === 'uncategorized' ? 'Uncategorized' : (CATEGORY_LABEL[category] ?? category),
      value,
    }))
    .sort((a, b) => b.value - a.value);
}
