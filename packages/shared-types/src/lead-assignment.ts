/**
 * Lead Assignment module domain types — the wire shapes returned by
 * the backend's `LoanApplicationsController`/`LeadAssignmentController`
 * (see `apps/backend/src/lead-assignment`), consumed by the admin
 * panel. Dates are ISO strings (JSON over the wire), not `Date`.
 */

export type LoanApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

/** A loan application as shown in the Unassigned/Assigned Leads screens. `assignedToId` is null = Unassigned. */
export interface LeadSummary {
  id: string;
  applicantId: string;
  applicantName: string | null;
  requestedAmount: string;
  requestedTermMonths: number;
  purpose: string | null;
  categoryId: string | null;
  status: LoanApplicationStatus;
  submittedAt: string;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  /** The assigned employee's private working notes — never shown to the customer. */
  internalNotes: string | null;
  internalNotesUpdatedAt: string | null;
}

/** What the admin sees before assigning a lead: identity, live presence, and current workload. */
export interface EmployeeWorkload {
  id: string;
  employeeCode: string | null;
  fullName: string | null;
  isOnline: boolean;
  lastActiveAt: string | null;
  activeLeadsCount: number;
  pendingLeadsCount: number;
  todaysWorkload: number;
}

export type LeadAssignmentAction = 'assign' | 'reassign' | 'transfer';

/** One row of a lead's complete assignment history. */
export interface LeadAssignmentHistoryEntry {
  id: string;
  action: LeadAssignmentAction;
  assignedById: string | null;
  assignedByName: string | null;
  previousEmployeeId: string | null;
  previousEmployeeName: string | null;
  newEmployeeId: string;
  newEmployeeName: string | null;
  createdAt: string;
}
