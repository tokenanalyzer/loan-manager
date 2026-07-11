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

export enum LoanApplicationStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
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
  OTHER = 'other',
}
