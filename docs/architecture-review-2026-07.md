# Architecture Review — India-First Production Pass (2026-07)

Written during the India-localization + production-readiness pass (currency, EMI,
KYC/PAN/Aadhaar, India-specific validation, bug fixes). This is a set of
recommendations for *future* work, not a description of what this pass built —
see the git history around this date for that. Organized by priority.

## 1. Replace the loan-category "product catalog" with a real table

**Current state:** loan categories (amount/term bounds, indicative interest
rates) live as a `const` list in
`packages/shared-flutter/lib/src/models/loan_category.dart`, and are mirrored by
hand in a backend map (`LOAN_CATEGORY_BOUNDS`,
`apps/backend/src/loan-applications/loan-application.constants.ts`). The backend
map exists so bounds are enforced server-side (they weren't before this pass —
a real bug this fixed), but it means the same six categories/ranges are now
defined in two places kept in sync by convention and code review, not by the
type system.

**Recommendation:** introduce a `loan_products` table (id, title, min/max
amount, min/max term, indicative rate range, active flag) with a small
`GET /v1/loan-products` endpoint. Both apps fetch it instead of hardcoding it;
the backend validates submissions against the same rows it just served. This
also unlocks product changes (adding a category, adjusting a rate band)
without an app release.

**Why not done now:** it's a genuine schema + endpoint + two-client-integration
change, not a bug fix — better scoped as its own reviewed piece of work than
folded into a localization pass.

## 2. Payments / repayment tracking is schema-only

`PaymentEntity` (`apps/backend/src/database/entities/payment.entity.ts`) has
existed since the initial schema migration and has **zero code anywhere**
touching it — no repayment-schedule generation on loan approval, no payment
recording endpoint, no service, no UI in either app. "Loan Tracking" in this
pass means showing the EMI/principal/rate/maturity-date the loan was
*approved* with (see `LoanApplicationResponseDto.loan`) — it does not mean
tracking actual repayments against that schedule.

**Recommendation:** a `PaymentsModule` (schedule generation on loan approval,
a "mark installment paid" staff action or payment-gateway webhook, and a
repayment-history screen in the Customer App) is the natural next major
feature — sized similarly to this pass, not a quick addition.

## 3. KYC verification is self-attested only — no live PAN/Aadhaar vendor call

This pass built PAN + Aadhaar **capture** (format-validated, Aadhaar hashed +
last-4-only stored, never the raw number) and a **manual staff review**
workflow (`CustomersService.reviewKyc`), by explicit decision — no vendor
credentials were available to integrate a real verification API, and Aadhaar
handling has real regulatory constraints (UIDAI restricts storing/using the
raw number) that deserve a dedicated compliance review before any live
integration, not a quick client wiring.

**Recommendation:** when ready, introduce a `KycVerificationProvider` interface
in the customers module with today's manual-review path as the default
implementation, and an NSDL/Protean (PAN) + UIDAI/DigiLocker (Aadhaar eKYC)
implementation behind the same interface. `CustomersService.reviewKyc` already
isolates the decision step, so this is a swap-the-provider change, not a
rewrite — but treat the actual vendor integration (API keys, consent flow,
data-handling agreement) as a legal/compliance-gated workstream, not a coding
task.

## 4. `apps/admin-panel` is an unbuilt scaffold

Confirmed during this pass's audit: it's a React+Vite+Firebase-auth shell with
one login screen and one placeholder status page — no staff management, no
KYC review queue, no loan oversight, no reporting. The KYC review UI this pass
needed was built in the Employee App (Flutter) instead, next to the existing
CRM screen, specifically to avoid scope-creeping this pass into building
admin-panel from zero.

**Recommendation:** admin-panel is the next reasonable major initiative once
this pass's changes are verified in the field — likely starting with the same
KYC review + loan oversight screens the Employee App now has, generalized for
a desk/back-office audience (bulk actions, reporting, staff account
management — see #6).

## 5. No staff/employee account provisioning endpoint

Confirmed while working on the KYC review flow: `AuthService` always creates a
new `UserEntity` as `role: CUSTOMER` on first Firebase sign-in (deliberately —
no client-controlled role escalation). There is **no endpoint anywhere** to
create an employee or admin account; it must be done directly against the
database today. This was true before this pass and remains true — flagging it
because the Employee App's new KYC-review feature makes the "who are our
staff users and how do we onboard one" gap more visible.

**Recommendation:** an admin-only "invite/create staff user" endpoint
(`POST /v1/users` restricted to `ADMIN`, or a signed invite-link flow) before
this app has real staff beyond whoever seeded the database by hand.

## 6. Other concrete findings from this pass, not fixed (out of scope)

- **No pagination/search on `GET /v1/customers`** (staff CRM list) — fine at
  today's data volume, will not be once there are hundreds of customers.
- **Notifications are single-producer** — `NotificationsService.createForUser`
  is called by `LoanApplicationsService` (approve/reject) and now also
  `CustomersService` (KYC verify/reject). No push delivery (FCM) despite
  Firebase already being wired up for auth — in-app list only.
- **`StorageService`'s only implementation is local disk** — fine for a
  single-instance dev/staging deployment, not for horizontal scaling in
  production (documented as a known, clean-swap gap by the module itself).
- **The Aadhaar-hash pepper is a fixed in-code constant**
  (`apps/backend/src/customers/aadhaar-hash.util.ts`) — adequate for today's
  "detect duplicates, never recover the number" use, but should move to a
  KMS-managed secret before this hash is used for anything higher-stakes
  (e.g. a real UIDAI verification handshake, per #3).
- **Migrations had never been run against a live Postgres instance** before
  this pass (each migration's own header comment flagged this) — now
  verified: all 6 migrations, including this pass's 2 new ones, run cleanly
  end-to-end against a fresh local database.
