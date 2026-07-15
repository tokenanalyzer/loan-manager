/**
 * File-upload constraints only. The document *type* catalog (which
 * codes exist, which are required, category grouping, upload-slot
 * limits, loan-category applicability) is data, not code — see the
 * `document_types` table / `DocumentTypeEntity`. Deliberately no
 * hardcoded type list here (Phase 2 of the Customer App production
 * sprint replaced the old fixed 6-value enum with that catalog table
 * specifically so new types never require a code change).
 */
export const MAX_DOCUMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Allowed upload MIME types — identity/income/address proof are
 * realistically photos or PDFs, regardless of which catalog type
 * they're filed under.
 */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];
