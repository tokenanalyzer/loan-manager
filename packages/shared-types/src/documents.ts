/**
 * Document Management Center domain types — mirrors the backend's
 * `DocumentResponseDto`/`DocumentAuditEntryDto`
 * (`apps/backend/src/documents`), consumed by the admin panel's
 * shared `features/documents/` module (Employee Portal / CRM / Super
 * Admin). Dates are ISO strings (JSON over the wire), not `Date`.
 */

/**
 * `reupload_requested` is a distinct state from `rejected` — the
 * "Request Re-upload" action, always customer-notified. Replacing a
 * document resets it to `pending` (a fresh verification cycle); the
 * prior verification is preserved in audit history, never overwritten.
 */
export type DocumentVerificationStatus = 'pending' | 'verified' | 'rejected' | 'reupload_requested';

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
  /** Points at this document's latest immutable upload (Document Versioning) — inert until a future Version History UI reads it. */
  currentVersionId: string | null;
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
  /** OR-group identifier — types sharing this code are alternatives of one requirement. */
  requirementGroupCode?: string;
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

/** Mirrors the backend's `DocumentVersionResponseDto` — one entry in a document's immutable upload history. */
export interface DocumentVersion {
  id: string;
  versionNumber: number;
  originalFileName: string;
  mimeType: string | null;
  fileSizeBytes: string | null;
  uploadedAt: string;
  uploadedById: string | null;
  uploadedByName: string | null;
  verificationStatus: DocumentVerificationStatus;
  verificationNote: string | null;
  verifiedById: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  /** Null = this is the current version (or was never superseded, e.g. a backfilled row). */
  supersededAt: string | null;
}

/**
 * Mirrors the backend's `DocumentCenterEntryDto` — one row of the
 * Enterprise Document Center's platform-wide listing
 * (`GET /v1/documents/staff`). Adds `ownerId`/`ownerName` on top of
 * what Customer 360's per-customer document view needed, since the
 * Document Center spans every customer at once.
 */
export interface DocumentCenterEntry {
  id: string;
  originalFileName: string;
  mimeType: string | null;
  category: string | null;
  typeLabel: string | null;
  uploadedAt: string;
  fileSizeBytes: string | null;
  verificationStatus: DocumentVerificationStatus;
  verifiedByName: string | null;
  verifiedAt: string | null;
  currentVersionNumber: number | null;
  uploadedByName: string | null;
  ownerId: string;
  ownerName: string | null;
}

/** Why a required document type is blocking loan approval — mirrors the backend's `BlockingDocumentReason`. */
export type BlockingDocumentReason = 'missing' | 'pending' | 'rejected' | 'reupload_requested';

/** Mirrors the backend's `DocumentCategory` enum (`database/entities/enums.ts`). */
export type DocumentCategory =
  | 'identity'
  | 'income'
  | 'employment'
  | 'balance_transfer'
  | 'loan_specific'
  | 'photo'
  | 'other';

/**
 * Settings → Document Types. Mirrors the backend's
 * `DocumentTypeResponseDto` (`documents/document-types.controller.ts`)
 * — the document catalog row an Admin manages directly, no migration
 * or Flutter release required to add/retire a type.
 */
export interface DocumentTypeCatalogEntry {
  code: string;
  label: string;
  category: DocumentCategory;
  isRequired: boolean;
  maxUploads: number;
  applicableLoanCategoryIds: string[] | null;
  requirementGroupCode: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `code` is immutable after creation — see `DocumentTypeCatalogEntry`'s doc comment. */
export interface CreateDocumentTypePayload {
  code: string;
  label: string;
  category: DocumentCategory;
  isRequired?: boolean;
  maxUploads?: number;
  applicableLoanCategoryIds?: string[];
  sortOrder?: number;
  requirementGroupCode?: string;
}

export type UpdateDocumentTypePayload = Partial<Omit<CreateDocumentTypePayload, 'code'>> & {
  isActive?: boolean;
};

/**
 * One required document type standing in the way of approval — the
 * backend's `PATCH /loan-applications/:id/review` returns a list of
 * these on a failed 'approve' decision (`LoanApplicationsService.
 * review`'s approval validation gate). Pure wire-shape mirror, no
 * validation logic — the backend remains the single source of truth
 * for which documents actually block approval.
 */
export interface BlockingRequiredDocument {
  code: string;
  label: string;
  reason: BlockingDocumentReason;
}
