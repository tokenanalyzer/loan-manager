import { DocumentType } from '../database/entities';

/**
 * Document types a customer can self-upload, with a display label.
 * `LOAN_AGREEMENT` is intentionally excluded — that's staff-generated,
 * not customer-uploaded. `OTHER` is excluded from the *required* set
 * but still a valid upload type.
 */
export const REQUIRED_CUSTOMER_DOCUMENT_TYPES: { type: DocumentType; label: string }[] = [
  { type: DocumentType.ID_PROOF, label: 'Government-issued ID' },
  { type: DocumentType.INCOME_PROOF, label: 'Proof of income' },
  { type: DocumentType.ADDRESS_PROOF, label: 'Proof of address' },
];

export const CUSTOMER_UPLOADABLE_DOCUMENT_TYPES: DocumentType[] = [
  DocumentType.ID_PROOF,
  DocumentType.INCOME_PROOF,
  DocumentType.ADDRESS_PROOF,
  DocumentType.OTHER,
];

export const MAX_DOCUMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Allowed upload MIME types (Phase 7 hardening — previously only file
 * *size* was limited, not type, letting a customer upload anything
 * including executables/HTML). Kept intentionally narrow: identity/
 * income/address proof are realistically photos or PDFs.
 */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];
