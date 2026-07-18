/**
 * Document Management Center domain types — mirrors the backend's
 * `DocumentResponseDto`/`DocumentAuditEntryDto`
 * (`apps/backend/src/documents`), consumed by the admin panel's
 * shared `features/documents/` module (Employee Portal / CRM / Super
 * Admin). Dates are ISO strings (JSON over the wire), not `Date`.
 */

export type DocumentVerificationStatus = 'pending' | 'verified' | 'rejected';

/** Full metadata for one uploaded document, including its verification state. */
export interface DocumentMetadata {
  id: string;
  documentTypeCode: string;
  slotIndex: number;
  label: string | null;
  originalFileName: string;
  mimeType: string | null;
  fileSizeBytes: string | null;
  uploadedAt: string;
  verificationStatus: DocumentVerificationStatus;
  verificationNote: string | null;
  verifiedById: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
}

export interface DocumentSlot {
  slotIndex: number;
  isUploaded: boolean;
  document?: DocumentMetadata;
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

/** Download Audit — one recorded access/verification event for a document. */
export interface DocumentAuditEntry {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
}
