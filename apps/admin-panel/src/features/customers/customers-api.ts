import type { AuditTrailEntry, CustomerOverview, CustomerSummary } from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';
import { triggerDownload } from '../documents/documents-api';

/** Customers API client — thin wrapper over the shared `apiClient` around `CustomersController` (admin/employee-only list). */
export async function fetchCustomers(): Promise<CustomerSummary[]> {
  const { data } = await apiClient.get<CustomerSummary[]>('/v1/customers');
  return data;
}

/** Customer 360 — identity + full profile + every application + every document, in one round trip. */
export async function fetchCustomerOverview(customerId: string): Promise<CustomerOverview> {
  const { data } = await apiClient.get<CustomerOverview>(`/v1/customers/${customerId}/overview`);
  return data;
}

/** Customer 360's Audit Trail — merges decision/assignment events across every one of this customer's applications. */
export async function fetchCustomerAuditTrail(customerId: string): Promise<AuditTrailEntry[]> {
  const { data } = await apiClient.get<AuditTrailEntry[]>(`/v1/customers/${customerId}/audit-trail`);
  return data;
}

/**
 * The mandatory "Download All Documents" feature — streams the ZIP as a
 * blob and triggers a browser save. The filename comes from the
 * backend's own `Content-Disposition` header rather than being
 * reconstructed client-side, so it always matches exactly what the
 * server actually named it.
 */
export async function downloadAllCustomerDocuments(customerId: string): Promise<void> {
  const response = await apiClient.get<Blob>(`/v1/customers/${customerId}/documents/download-all`, {
    responseType: 'blob',
  });
  const disposition = response.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="([^"]+)"/);
  const fileName = match?.[1] ?? `Documents-${customerId}.zip`;

  triggerDownload(response.data, fileName);
}
