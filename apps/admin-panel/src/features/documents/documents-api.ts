import type {
  DocumentAuditEntry,
  DocumentCenterEntry,
  DocumentsOverview,
  DocumentVerificationStatus,
  DocumentVersion,
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

/** Enterprise Document Center — every document the caller can see, optionally filtered. */
export async function fetchAllDocuments(filters: {
  category?: string;
  verificationStatus?: DocumentVerificationStatus;
  search?: string;
}): Promise<DocumentCenterEntry[]> {
  const { data } = await apiClient.get<DocumentCenterEntry[]>('/v1/documents/staff', {
    params: filters,
  });
  return data;
}

/** Version History — every immutable upload for a document, newest first. Reuses the existing (previously unused) versions endpoint. */
export async function fetchDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const { data } = await apiClient.get<DocumentVersion[]>(`/v1/documents/staff/${documentId}/versions`);
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

/** Customer 360's permission-controlled Delete action — admin-only, see DocumentsController.deleteForStaff. */
export async function deleteDocumentForStaff(documentId: string): Promise<void> {
  await apiClient.delete(`/v1/documents/staff/${documentId}`);
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
