/**
 * Customer domain types — mirrors the backend's
 * `CustomerSummaryResponseDto` (`apps/backend/src/customers`). Identity
 * fields only, no full profile (address/income/etc — fetched
 * separately per-customer, not needed for a list/dashboard view).
 */
export interface CustomerSummary {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}
