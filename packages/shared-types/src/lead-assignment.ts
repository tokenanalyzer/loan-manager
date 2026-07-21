/**
 * Lead Assignment module domain types — the wire shapes returned by
 * the backend's `LoanApplicationsController`/`LeadAssignmentController`
 * (see `apps/backend/src/lead-assignment`), consumed by the admin
 * panel. Dates are ISO strings (JSON over the wire), not `Date`.
 */

export type LoanApplicationStatus =
  'submitted' | 'under_review' | 'query_raised' | 'approved' | 'rejected' | 'withdrawn';

/**
 * Request-type reservation — only `FRESH_LOAN` is exercised by any
 * client today; the rest are reserved ahead of the Customer Benefits
 * module (mirrors `LOAN_REQUEST_TYPES` in the backend's
 * `loan-application.constants.ts`).
 */
export type LoanRequestType = 'FRESH_LOAN' | 'TOP_UP' | 'BALANCE_TRANSFER' | 'BT_TOPUP' | 'BT_FRESH';

/** A loan application as shown in the Unassigned/Assigned Leads screens. `assignedToId` is null = Unassigned. */
export interface LeadSummary {
  id: string;
  applicantId: string;
  applicantName: string | null;
  requestedAmount: string;
  requestedTermMonths: number;
  purpose: string | null;
  categoryId: string | null;
  requestType: LoanRequestType;
  status: LoanApplicationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  rejectionReason: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  /** The assigned employee's private working notes — never shown to the customer. */
  internalNotes: string | null;
  internalNotesUpdatedAt: string | null;
  /** Customer↔Employee query workflow. */
  queryMessage: string | null;
  queryRaisedById: string | null;
  queryRaisedByName: string | null;
  queryRaisedAt: string | null;
  queryRespondedAt: string | null;
  /** Waiting-for-Customer visibility — independent of `status`; set when any of this customer's documents are `reupload_requested`. */
  waitingForCustomer: boolean;
  waitingForCustomerSince: string | null;
  /** Loan Against Property (`categoryId: 'lap'`) collateral facts — null for every other category. */
  propertyType: string | null;
  propertyOwnership: string | null;
  propertyAddress: string | null;
  propertyValue: string | null;
  hasExistingLoanOnProperty: boolean | null;
  existingLoanOutstandingAmount: string | null;
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
