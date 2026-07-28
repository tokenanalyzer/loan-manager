import type {
  CreateDocumentTypePayload,
  DocumentTypeCatalogEntry,
  UpdateDocumentTypePayload,
} from '@loan-manager/shared-types';

import { apiClient } from '../../lib/api-client';

/**
 * Document Types catalog API client — thin wrappers over the shared
 * `apiClient` around `DocumentTypesController` on the backend
 * (admin-only). The backend endpoints already existed fully built;
 * this is the first UI wired to them.
 */

export async function fetchDocumentTypes(): Promise<DocumentTypeCatalogEntry[]> {
  const { data } = await apiClient.get<DocumentTypeCatalogEntry[]>('/v1/document-types');
  return data;
}

export async function createDocumentType(
  payload: CreateDocumentTypePayload,
): Promise<DocumentTypeCatalogEntry> {
  const { data } = await apiClient.post<DocumentTypeCatalogEntry>('/v1/document-types', payload);
  return data;
}

export async function updateDocumentType(
  code: string,
  payload: UpdateDocumentTypePayload,
): Promise<DocumentTypeCatalogEntry> {
  const { data } = await apiClient.patch<DocumentTypeCatalogEntry>(`/v1/document-types/${code}`, payload);
  return data;
}
