/** Human label for a raw Audit Trail action code — the backend keeps these as stable, greppable strings; this is presentation-only. Shared by the per-application and per-customer Audit Trail sections. */
const AUDIT_ACTION_LABEL: Record<string, string> = {
  loan_application_approved: 'Application approved',
  loan_application_rejected: 'Application rejected',
  loan_application_query_raised: 'Query raised',
  loan_application_query_responded: 'Customer responded to query',
  loan_disbursed: 'Loan disbursed',
  assign: 'Assigned',
  reassign: 'Reassigned',
  transfer: 'Transferred',
};

export function describeAuditAction(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action.replace(/_/g, ' ');
}
