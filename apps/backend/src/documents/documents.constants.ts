import { DocumentType } from '../database/entities';

/**
 * Document types a customer can self-upload, with a display label.
 * `LOAN_AGREEMENT` is intentionally excluded — that's staff-generated,
 * not customer-uploaded. `OTHER` is excluded from the *required* set
 * but still a valid upload type.
 *
 * India-localization pass: PAN + Aadhaar are now required KYC
 * documents (replacing the generic `ID_PROOF`) alongside income and
 * address proof. `ID_PROOF` remains a valid *uploadable* type for any
 * other government ID a customer wants to add, just not required.
 */
export const REQUIRED_CUSTOMER_DOCUMENT_TYPES: { type: DocumentType; label: string }[] = [
  { type: DocumentType.PAN_CARD, label: 'PAN card' },
  { type: DocumentType.AADHAAR_CARD, label: 'Aadhaar card' },
  { type: DocumentType.INCOME_PROOF, label: 'Proof of income' },
  { type: DocumentType.ADDRESS_PROOF, label: 'Proof of address' },
];

export const CUSTOMER_UPLOADABLE_DOCUMENT_TYPES: DocumentType[] = [
  DocumentType.PAN_CARD,
  DocumentType.AADHAAR_CARD,
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
