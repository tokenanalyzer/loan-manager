# Work Summary — 2026-07-14

Session scope: Google Sign-In integration, then a full India-first localization
pass, then a premium "Loan Marketplace" redesign of the Customer App, spanning
`apps/backend`, `apps/customer-app`, `apps/employee-app`, and
`packages/shared-flutter`.

75 files changed, ~2,716 insertions / ~872 deletions (uncommitted — see
"Remaining tasks").

## Features completed today

### Authentication
- Google Sign-In implemented end-to-end (Firebase config, native Android
  wiring, `google_sign_in` package, "Continue with Google" button on login)
  alongside the existing Phone OTP flow — neither replaces the other.
- Centralized 401 handling: `ApiClient.setUnauthorizedHandler()` wired to
  `CustomerAuthRepository.signOut()` so an expired session cleanly redirects
  to `/login` instead of leaving a screen stuck on a dead error.

### India-first localization
- Real Indian loan categories: Personal, Home, Business, Education, Vehicle,
  Gold Loan (Home Improvement removed), each with real min/max amount, term
  bounds, indicative rate range, and processing-fee percent — mirrored
  identically in backend (`LOAN_CATEGORY_BOUNDS`) and shared-flutter
  (`kLoanCategories`).
- ₹ formatting everywhere via `Formatters.currency()` (Indian digit grouping)
  and backend `formatInr()`, replacing raw `$`/unformatted numbers.
- KYC: PAN + Aadhaar (masked, hashed) fields, `KycStatus` enum, auto-transition
  to `PENDING_REVIEW` once both are on file, staff verify/reject endpoint with
  audit log + notification.
- Bank account (masked) and nominee fields added to customer profile, editable
  in-app, staff-visible where appropriate.
- RBI Key-Fact-Statement-style cost transparency: every EMI view now shows
  EMI, total interest, processing fee, 18% GST on fee, net disbursed, and
  total payable — not just a bare EMI number (`LoanCostBreakdownCard`,
  `computeLoanCostBreakdown`).
- FOIR-based loan eligibility estimate (`estimateEligibleAmount`), disclosed
  as "indicative, subject to verification" per RBI digital-lending norms.

### Premium Customer App redesign (post plan-revision, CRED/Navi/BankBazaar direction)
- New design system in `shared-flutter`: deep indigo + warm gold palette,
  full typography scale, themed cards/buttons/chips/inputs, dark-mode parity,
  `SkeletonLoader`/`SkeletonCard` shimmer loading states.
- Home dashboard rebuilt from scratch: time-of-day greeting header with
  avatar + notification bell, Credit Profile card (honest "Profile Strength"
  ring, not a fabricated credit score), Loan Eligibility / Pre-approved
  Offers section, Active Applications with per-loan progress bars, EMI
  Summary (only shown when relevant), an honest "Lending Partners" section
  (own brand "Active" + explicitly-labeled "Coming soon" tiles — no invented
  bank names/partnerships), Recommended Loan Products with inline eligibility,
  Quick Actions, Recent Activity feed (merged applications + notifications).
- New standalone EMI Calculator tool (`/tools/emi-calculator`).
- Profile view/edit rebuilt: identity card, KYC status, PAN/Aadhaar (masked),
  address/occupation/income, bank account (masked), nominee, sign-out moved
  here from the old home AppBar.
- My Applications / Application Detail: category name, EMI, real progress
  bars everywhere a bare status badge used to be.
- Centralized friendly error copy (`friendlyMessage()`) — no screen shows raw
  `NetworkException(...)` text anymore.

## Bugs fixed
1. **Malformed `google-services.json`** (concatenated old+new file) — replaced
   with the correct single JSON.
2. **Windows Firewall blocking backend on Public network profile** — network
   category switched to Private for the active Wi-Fi interface so the phone
   could reach the dev machine.
3. **Employee-app couldn't build at all** — Gradle/AGP/Kotlin were still
   pinned to old versions (AGP 7.3.0/Kotlin 1.9.24/Gradle 7.6.3) while
   customer-app had already been bumped; applied the same bump (AGP 9.0.1,
   Kotlin 2.3.20, Gradle 9.1.0, Java target 17) to employee-app.
4. **Employee-app couldn't reach the backend from a physical device** —
   `API_BASE_URL` was still `localhost`; corrected to the LAN IP
   (`192.168.1.9`), matching customer-app.
5. **`aadhaar_last_4` vs `aadhaar_last4` column mismatch** — TypeORM's
   `SnakeNamingStrategy` doesn't insert an underscore before a trailing digit;
   fixed with a corrective migration rather than editing the already-applied
   one.
6. **Critical: Profile screen showed "Something went wrong" for every
   customer with no profile row yet.** Root cause: NestJS sends an *empty*
   HTTP body for handlers returning `null` (not the JSON text `null`); Dio
   then returns `''` instead of Dart `null`, and every `data == null ? null :
   X.fromJson(data as Map)` mapper in both apps threw a type-cast exception
   on the empty string instead of matching the null case. Fixed once, centrally,
   in `ApiClient._normalizeEmptyBody()` (shared-flutter) rather than patching
   each repository mapper — fixes every current and future nullable endpoint
   in both apps.
7. Stale doc comment on `audit-log.entity.ts` claiming "nothing writes to
   this table yet" (false) — corrected.
8. Missing `phone` field on `UserProfileResponseDto` — Profile screen needed
   it and the backend simply wasn't returning it.

## Files modified
Full list is in `git status` / `git diff --stat` (75 files). Highlights by area:

- **Backend** (`apps/backend/src`): customer-profile entity + enums, 4 new
  migrations, customers service/controller/DTOs (KYC, bank, nominee),
  loan-application constants/DTOs/service (categories, cost breakdown),
  documents constants (PAN/Aadhaar upload types), new `currency.util.ts`,
  new `emi.util.ts`, new `aadhaar-hash.util.ts`.
- **shared-flutter** (`packages/shared-flutter/lib`): theme (colors, text
  styles, ThemeData) rewritten; new `loan_category.dart`, `formatters.dart`,
  `emi_calculator.dart`, `eligibility_calculator.dart`,
  `loan_cost_breakdown.dart`, `status_badge.dart`; `base_repository.dart`
  gains shared `patch<T>()`; `api_client.dart` gains empty-body normalization
  + unauthorized-handler hook.
- **Customer app** (`apps/customer-app/lib`): home controller + screen
  rewritten, loan catalog/details/flow/detail/my-applications screens
  rewritten, profile view/edit rewritten, new `friendly_error.dart`,
  `skeleton_loader.dart`, `loan_cost_breakdown_card.dart`,
  `emi_calculator_screen.dart` + route, DI wiring for 401 handling, Android
  Gradle bumps, `env/development.json` LAN IP + Firebase enabled.
- **Employee app** (`apps/employee-app/lib`): customer/loan models gain KYC
  and category fields, customer repository gains `verifyKyc`/`rejectKyc`,
  customer-detail screen gains KYC review UI, home screen dev-text removed,
  Android Gradle bumps, `env/development.json` LAN IP fix.
- **Docs**: new `docs/architecture-review-2026-07.md` (forward-looking
  architecture notes — product catalog, payments module, KYC vendor
  integration point, admin-panel build-out, staff provisioning gap).

## APIs changed
- `PATCH /v1/customers/:id/kyc-review` (new) — staff KYC verify/reject.
- `PATCH /v1/customers/me` (existing endpoint, extended payload) — now
  accepts `panNumber`, `aadhaarNumber` (write-only), `postalCode`,
  `bankAccountNumber`, `bankIfscCode`, `bankAccountHolderName`,
  `nomineeName`, `nomineeRelationship`.
- `GET /v1/customers/me` response — now includes `panNumber`,
  `aadhaarLast4` (masked), `kycStatus`, `kycRejectionReason`,
  `bankAccountLast4` (masked), `bankIfscCode`, `bankAccountHolderName`,
  `nomineeName`, `nomineeRelationship`. Never exposes full Aadhaar or full
  bank account number.
- `GET /v1/users/me` response — now includes `phone`.
- Loan application create/response DTOs — accept/return `categoryId`; response
  now includes a computed `loan` object (EMI, total interest, total payable)
  when a loan exists.
- Document upload — `PAN_CARD` and `AADHAAR_CARD` added to accepted/required
  document types.

## Database changes
Four new migrations (all applied to local Postgres, verified via
`npm run migration:run` → "No migrations are pending"):
1. `1783771700000-AddLoanApplicationCategoryId` — adds `category_id`.
2. `1783771800000-AddKycFieldsAndDocumentTypes` — `kyc_status_enum`, renames
   `national_id_number` → `pan_number`, adds Aadhaar fields, adds
   `pan_card`/`aadhaar_card` to `document_type_enum`.
3. `1783771900000-FixAadhaarLast4ColumnName` — corrective rename
   `aadhaar_last_4` → `aadhaar_last4`.
4. `1783772000000-AddBankAccountAndNomineeFields` — bank account/IFSC/holder
   name, nominee name/relationship.

## Remaining tasks
- **Nothing is committed yet** — all 75 files are uncommitted working-tree
  changes. Decide on commit strategy (single squash vs. logical commits) next
  session before doing anything else risky.
- Employee-app customer model/repository does not yet expose bank
  account/nominee fields (explicitly deferred — staff don't currently need
  to see them, but flag if that changes).
- Real multi-lender backend (Bank Portal / partner banks) — out of scope by
  design this pass; "Lending Partners" section is intentionally honest
  placeholders only.
- Real credit-bureau (CIBIL) integration — separate compliance/vendor
  workstream, not attempted.
- DSA App, Bank Portal, Super Admin Panel — not started; next per the user's
  stated roadmap.
- Category-specific collateral document requirements (e.g. gold loan jewelry
  appraisal, home loan property documents) not yet modeled.
- Payments/repayment tracking module — not implemented (loans track
  disbursement but not repayment schedule/collection).
- See `docs/architecture-review-2026-07.md` for the fuller architecture
  backlog (pagination, notification fan-out, storage service, migration
  verification, staff provisioning).
