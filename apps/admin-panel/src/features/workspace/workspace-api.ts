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

/** Document Viewer. */
export interface DocumentSlot {
  slotIndex: number;
  isUploaded: boolean;
  document?: {
    id: string;
    documentTypeCode: string;
    label: string | null;
    originalFileName: string;
    mimeType: string | null;
    fileSizeBytes: string | null;
    uploadedAt: string;
  };
}

export interface DocumentTypeOverview {
  code: string;
  label: string;
  isRequired: boolean;
  maxUploads: number;
  slots: DocumentSlot[];
}

export interface DocumentsOverview {
  categories: { category: string; types: DocumentTypeOverview[] }[];
}

export async function fetchCustomerDocuments(customerId: string): Promise<DocumentsOverview> {
  const { data } = await apiClient.get<DocumentsOverview>(
    `/v1/documents/staff/customer/${customerId}`,
  );
  return data;
}

/** Fetches a document's bytes for in-page preview (the endpoint needs a bearer token, so a plain <img>/<iframe> src can't be used directly). */
export async function fetchDocumentBlob(documentId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/v1/documents/staff/${documentId}/content`, {
    responseType: 'blob',
  });
  return data;
}
