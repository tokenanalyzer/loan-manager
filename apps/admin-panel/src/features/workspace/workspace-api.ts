import type { LeadAssignmentHistoryEntry, LeadSummary } from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

/**
 * Employee Workspace API client — thin wrappers over the shared
 * `apiClient`, entirely reusing existing backend endpoints
 * (`loan-applications`, `customers`, `documents`, `lead-assignment`).
 * No new backend surface beyond the notes endpoint (see
 * `PATCH /loan-applications/:id/notes`) and widening the assignment
 * history endpoint to the owning employee.
 */

/** "My Assigned Leads" / "Lead List" — the backend already scopes this to the caller's own leads for EMPLOYEE. */
export async function fetchMyLeads(): Promise<LeadSummary[]> {
  const { data } = await apiClient.get<LeadSummary[]>('/v1/loan-applications');
  return data;
}

export async function fetchLead(id: string): Promise<LeadSummary> {
  const { data } = await apiClient.get<LeadSummary>(`/v1/loan-applications/${id}`);
  return data;
}

/** Internal Notes — autosaved; ownership re-checked server-side (Lead Locking). */
export async function updateLeadNotes(id: string, notes: string): Promise<LeadSummary> {
  const { data } = await apiClient.patch<LeadSummary>(`/v1/loan-applications/${id}/notes`, {
    notes,
  });
  return data;
}

/** Employee review — Approve / Reject / Raise Query, all via the one existing review endpoint. */
export interface ReviewLeadPayload {
  decision: 'approve' | 'reject' | 'query';
  interestRate?: number;
  queryMessage?: string;
  rejectionReason?: string;
}

export async function reviewLead(id: string, payload: ReviewLeadPayload): Promise<LeadSummary> {
  const { data } = await apiClient.patch<LeadSummary>(
    `/v1/loan-applications/${id}/review`,
    payload,
  );
  return data;
}

/** Activity History / Timeline — reuses the Lead Assignment audit trail. */
export async function fetchLeadHistory(id: string): Promise<LeadAssignmentHistoryEntry[]> {
  const { data } = await apiClient.get<LeadAssignmentHistoryEntry[]>(
    `/v1/lead-assignment/leads/${id}/history`,
  );
  return data;
}

/** Customer Information. */
export interface CustomerSummary {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface CustomerProfile {
  userId: string;
  dateOfBirth: string | null;
  panNumber: string | null;
  aadhaarLast4: string | null;
  kycStatus: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  employmentStatus: string | null;
  monthlyIncome: string | null;
  companyName: string | null;
  designation: string | null;
}

export async function fetchCustomerSummary(customerId: string): Promise<CustomerSummary> {
  const { data } = await apiClient.get<CustomerSummary>(`/v1/customers/${customerId}`);
  return data;
}

export async function fetchCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
  const { data } = await apiClient.get<CustomerProfile | null>(
    `/v1/customers/${customerId}/profile`,
  );
  return data;
}
