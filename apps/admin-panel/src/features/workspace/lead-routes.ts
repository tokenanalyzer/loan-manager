/**
 * Role-aware lead-detail route — Admin and Employee land on different
 * screens for the same underlying loan application (`/applications/:id`
 * vs `/employee/my-leads/:id`). Shared by `NotificationsPage`'s
 * deep-link resolution and `CustomerDetailPage`'s Application History
 * row-click (the employee-403 bug found during the Employee CRM
 * audit), so the two can never drift apart again. `null` means "no
 * role-appropriate detail screen" — caller should not navigate.
 */
export function getLeadDetailRoute(role: string | undefined, leadId: string): string | null {
  if (role === 'admin') return `/applications/${leadId}`;
  if (role === 'employee') return `/employee/my-leads/${leadId}`;
  return null;
}
