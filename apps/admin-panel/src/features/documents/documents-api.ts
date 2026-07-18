import type {
  DocumentAuditEntry,
  DocumentsOverview,
  DocumentVerificationStatus,
} from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

/**
 * Document Management Center API client — entirely reuses the
 * existing `documents` endpoints (staff overview/content), plus the
 * two additions this module needed: verification status and the
 * download/verification audit trail (both under `staff/:id/...`,
 * same auth/ownership model as the existing staff content route).
 */

export async function fetchCustomerDocuments(customerId: string): Promise<DocumentsOverview> {
  const { data } = await apiClient.get<DocumentsOverview>(
    `/v1/documents/staff/customer/${customerId}`,
  );
  return data;
}

/** Fetches a document's bytes (the endpoint needs a bearer token, so a plain <img>/<iframe> src can't be used directly). */
export async function fetchDocumentBlob(documentId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/v1/documents/staff/${documentId}/content`, {
    responseType: 'blob',
  });
  return data;
}

export async function updateDocumentVerification(
  documentId: string,
  status: DocumentVerificationStatus,
  note?: string,
): Promise<void> {
  await apiClient.patch(`/v1/documents/staff/${documentId}/verification`, { status, note });
}

export async function fetchDocumentAudit(documentId: string): Promise<DocumentAuditEntry[]> {
  const { data } = await apiClient.get<DocumentAuditEntry[]>(
    `/v1/documents/staff/${documentId}/audit`,
  );
  return data;
}

/** Triggers a browser download/save from an already-fetched blob (used after preview or standalone). */
export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatFileSize(bytes: string | null): string {
  if (!bytes) return '—';
  const value = Number(bytes);
  if (!Number.isFinite(value)) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
