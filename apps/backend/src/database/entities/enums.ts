/**
 * Enums shared by entities in the loan domain schema.
 *
 * These are structural/data-model enums only (used as Postgres native
 * enum types via migrations) — no workflow or business logic is
 * implemented against them yet.
 */

export enum UserRole {
  CUSTOMER = 'customer',
  EMPLOYEE = 'employee',
  ADMIN = 'admin',
}

/**
 * Employee Work Status / Break Management. `ONLINE`/`BUSY` are
 * manually-settable non-break statuses; the five break types below
 * put the Employee Portal into Break Mode (see `WORK_STATUS_BREAK_TYPES`
 * in the work-status module); `OFFLINE` is derived from presence
 * (`UserEntity.lastActiveAt`), never stored/set directly.
 */
export enum WorkStatus {
  ONLINE = 'online',
  BUSY = 'busy',
  TEA_BREAK = 'tea_break',
  LUNCH_BREAK = 'lunch_break',
  MEETING = 'meeting',
  TRAINING = 'training',
  AWAY = 'away',
  OFFLINE = 'offline',
}

export enum LoanApplicationStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  /** Employee raised a query — waiting on the customer to re-upload/clarify. See LoanApplicationsService.resolveQueriesForCustomer. */
  QUERY_RAISED = 'query_raised',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export enum LoanStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active',
  CLOSED = 'closed',
  DEFAULTED = 'defaulted',
}

export enum PaymentStatus {
  SCHEDULED = 'scheduled',
  PAID = 'paid',
  LATE = 'late',
  MISSED = 'missed',
}

export enum DocumentType {
  ID_PROOF = 'id_proof',
  INCOME_PROOF = 'income_proof',
  ADDRESS_PROOF = 'address_proof',
  LOAN_AGREEMENT = 'loan_agreement',
  PAN_CARD = 'pan_card',
  AADHAAR_CARD = 'aadhaar_card',
  OTHER = 'other',
}

/**
 * Legacy/compatibility enum only — `documents.document_type` is kept
 * populated (see `ExtendDocumentsForCatalog` migration) but nothing
 * reads it going forward. The real, extensible type system is the
 * `document_types` catalog table (`DocumentTypeEntity`), keyed by a
 * free-form `code`, not this enum.
 */

/** The top-level groupings a `DocumentTypeEntity` belongs to. */
export enum DocumentCategory {
  IDENTITY = 'identity',
  INCOME = 'income',
  EMPLOYMENT = 'employment',
  BALANCE_TRANSFER = 'balance_transfer',
  LOAN_SPECIFIC = 'loan_specific',
  /** Passport photo / live selfie — DB prep for the Photo Verification feature (Sprint 2). */
  PHOTO = 'photo',
  OTHER = 'other',
}

/**
 * KYC (Know Your Customer) verification status — self-attested PAN +
 * Aadhaar capture, reviewed manually by staff (no live NSDL/UIDAI
 * vendor integration; see docs/architecture-review-2026-07.md for
 * that as a future integration point).
 */
export enum KycStatus {
  NOT_SUBMITTED = 'not_submitted',
  PENDING_REVIEW = 'pending_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}
