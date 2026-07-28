/**
 * Enums shared by entities in the loan domain schema.
 *
 * These are structural/data-model enums only (used as Postgres native
 * enum types via migrations) — no workflow or business logic is
 * implemented against them yet.
 */

/**
 * ORG_ADMIN and MANAGER sit between EMPLOYEE and ADMIN. ADMIN is
 * labelled "Super Admin" in the UI (see admin-panel's ROLE_LABELS) —
 * that mapping predates these two values and is left unchanged, so
 * ORG_ADMIN carries the "Admin" label instead. See
 * ROLE_PERMISSIONS in ../../auth/permissions.ts for what each tier
 * can actually do.
 */
export enum UserRole {
  CUSTOMER = 'customer',
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  ORG_ADMIN = 'org_admin',
  ADMIN = 'admin',
}

/**
 * Team Management lifecycle state (Admin Authentication Module, Phase
 * 3). Deliberately a distinct field from `UserEntity.isActive`, not a
 * replacement for it: `isActive` stays the one thing `SyncUserGuard`
 * enforces on every request (`ACTIVE` here always implies
 * `isActive: true`; `DISABLED`/`ARCHIVED` always imply `isActive:
 * false` — `UsersService`'s lifecycle methods keep both in lockstep),
 * so no existing enforcement path changes. This enum exists so the
 * Team screen and audit trail can distinguish *why* an account is
 * inactive, which a boolean can't express.
 *
 * DISABLED — reversible, short/medium-term suspension. ARCHIVED — a
 * superset of Disabled (also excluded from active operational
 * surfaces like the Lead Assignment picker), for someone who has
 * actually left. Neither is a delete: nothing about the row's
 * historical attributions (reviews performed, leads assigned, audit
 * `actorId`) ever changes.
 */
export enum AccountStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  ARCHIVED = 'archived',
}

/**
 * Maker-checker approval request lifecycle (Admin Authentication
 * Module, Phase 5). `FAILED` is distinct from `REJECTED`: it means a
 * checker approved the request but the underlying action's precondition
 * had drifted since the request was created (e.g. the target was
 * already disabled by someone else in the meantime) — see
 * `ApprovalsService.decide`. Never left `PENDING` forever either way.
 */
export enum ApprovalRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  FAILED = 'failed',
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

/**
 * Personal Loan reward lifecycle. A `RewardEntity` only ever starts
 * life as `ACCRUED` — see `RewardsService.generateForDisbursedLoan`,
 * which is the *only* code path that creates one, and only runs once a
 * loan is genuinely disbursed. `PAID` is a future manual/admin action
 * (no payout integration exists yet); `CANCELLED` covers a disbursed
 * loan later reversed/defaulted — a data-integrity case worth having a
 * state for even before anything triggers it.
 */
export enum RewardStatus {
  ACCRUED = 'accrued',
  PAID = 'paid',
  CANCELLED = 'cancelled',
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

/**
 * Employee CRM — a scheduled, note-bearing action an employee owns
 * against a lead. Deliberately the one concept covering everything
 * the Employee CRM initiative's "Today's Tasks"/"Pending Follow-ups"/
 * "Call Notes"/"Next Follow-up Date"/"Reminders" asks collapsed onto:
 * `dueAt` being today makes it a task for today; `status = PENDING`
 * makes it a pending follow-up; `note` is the call note; `dueAt`
 * itself is the next follow-up date. See `FollowUpEntity`.
 *
 * "Reminders" are passive (surfaced via query, e.g. due-today/overdue)
 * this round, not proactive push alerts — no scheduler infrastructure
 * exists in this codebase to fire those, and adding one is out of
 * scope for this pass; explicitly deferred, not silently dropped.
 */
export enum FollowUpStatus {
  PENDING = 'pending',
  DONE = 'done',
  CANCELLED = 'cancelled',
}
