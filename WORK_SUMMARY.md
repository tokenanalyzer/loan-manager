# Work Summary — 2026-07-20

Session scope: closed out **Sprint 1** (planned and implemented earlier this
session — request-type reservation, admin-reachable document/loan routes,
Work Status UI wiring, standardized document actions + verification
lifecycle + approval gate, Legal module, Photo Verification DB prep),
carried out manual on-device recovery/testing of it, then did a **Customer
App UI simplification** pass removing the pre-application loan-calculation
screen. Everything below was uncommitted going into today; all of it is now
committed to `main` (not pushed).

**Committed** — 5 commits on `main`, not yet pushed (`origin/main` has 3
commits this branch doesn't, from before this session; no conflict expected,
just needs a pull/push reconciliation before publishing):
- `8119d80` feat(backend): Sprint 1 — request-type reservation, photo
  verification DB prep, document lifecycle & approval gate
- `8d06b4e` feat(admin-panel): Sprint 1 — admin lead routes, work status UI
  wiring, standardized document actions
- `bc71698` feat(customer-app): add Legal module (7 pages), fix Firebase
  project id, standardize support email
- `fdae60c` feat(customer-app): remove pre-application calculation screen,
  go straight to application form
- `00c0f46` docs: add Master Product Spec v1.0 and ADR for multi-slot
  document blocking

## 1. Sprint 1 (backend + admin-panel + customer-app Legal module)
Full detail is in `docs/MASTER_PRODUCT_SPEC.md` and
`docs/adr/0001-multi-slot-document-blocking.md`. Headline pieces: a
mandatory backend-enforced approval gate (an application can't be approved
while any required document is unverified — structured `blockingDocuments`
on the 409), a standard document verification lifecycle (replacing a
document resets it to a fresh `pending` cycle, prior verification preserved
in audit history), a `waitingForCustomer` flag fully decoupled from the
application's `status` (works even under `QUERY_RAISED`), admin-reachable
`/leads/:id` routing, the previously-built-but-never-mounted Work Status UI
(break overlay/force-resume banner) wired into `AppLayout`, and a 7-page
static Legal module in the Customer App. Root-caused and fixed three
non-obvious infra bugs along the way: a Postgres migration-transaction
enum-value conflict, a silent CJS/ESM interop bug in `shared-types`'
production bundle, and `AllExceptionsFilter` dropping custom exception
fields like `blockingDocuments`.

## 2. Customer App UI simplification (today's explicit scope)
Removed the entire pre-application calculator screen (`LoanDetailsScreen`:
amount range, estimated EMI, interest/fee/GST breakdown, net disbursed,
total payable, eligibility guidance) from the user journey — this is a loan
facilitation platform, not an EMI calculator, and showing computed figures
before an application exists was misleading. New flow: Loan Card → tap →
application form directly (no intermediate screen, no "Start Application"
button — there wasn't one left in the reachable flow once the calculator
screen was bypassed). Added a small, compact header on the form's first
step only (product name, one-line description, italic disclaimer: "Final
loan terms, eligibility and charges are determined by the partner lender
after application review."), so the first input field still opens without
extra scrolling. `LoanDetailsScreen` itself was **kept** in the codebase
(unreachable, marked with a doc comment) rather than deleted, at the user's
explicit request, pending a future cleanup sprint. The in-wizard live cost
estimate, the review step's cost summary, and the post-approval
`ApplicationDetailScreen` all reuse the same `LoanCostBreakdownCard` and
were intentionally left untouched.

Checks run: `flutter analyze` (clean), `flutter test` (1/1 passing), fresh
debug APK built and installed on-device. Manually verified on-device: Home
→ Quick Apply → Personal Loan opens the application form directly with the
new header, Step 1 pre-filled from the existing profile, no scrolling
needed to reach the first field.

## 3. Known issue found during on-device testing — NOT fixed today
While verifying the new flow on-device, an unexpected **"Personal Loan
submitted, ₹10,00,000.00"** entry appeared on Home after a single Android
system-back-button press (no form was filled or submitted by the
automation). Active applications count and credit-profile completion also
changed at the same time. A different app (unrelated to this codebase) was
also observed briefly in the foreground during an earlier tap in the same
session — the phone may have been in concurrent use elsewhere while it was
being driven over `adb`, which is the leading hypothesis, but this is
**unconfirmed**. Root cause not investigated. See `TODO_NEXT_SESSION.md`.

---

# Work Summary — 2026-07-16/17

Session scope: Customer App **production freeze** sprint — finished the
Document Manager (PDF support was the one major gap left from 2026-07-15),
completed the loan wizard's Review step, added a real (if backend-less)
dynamic Lending Partners section, added a sign-out confirmation, fixed two
Android build/runtime issues found during on-device testing, and produced
`CUSTOMER_APP_RELEASE_CHECKLIST.md`. Explicitly out of scope per instruction:
DSA App, Employee App, Bank Portal, Super Admin Panel, Splash Screen.

**Committed and pushed** — `4e3e6f1` on `main`
("feat(customer-app): production checkpoint before splash screen"), 21 files,
667 insertions / 122 deletions. `origin/main` confirmed up to date.

## 1. Document Manager — PDF support (the headline gap)

- Added `file_picker` (Files/PDF picker — camera and gallery already
  existed) and `pdfx` (in-app PDF viewer, pdfium/FFI, no license key
  required, unlike Syncfusion) + `photo_view` (pinch-zoom image viewer).
- `documents_checklist.dart`: upload bottom sheet is now 3 options
  (Camera / Gallery / Choose a file, filtered to PDF/JPG/JPEG/PNG); added
  client-side pre-upload validation (`core/utils/document_validation.dart`
  — 10 MB cap + extension allowlist, mirroring the backend's existing
  limits) so bad files are rejected instantly instead of after a failed
  upload; file size now displayed on every uploaded slot
  (`Formatters.fileSize`, new, in `shared-flutter`).
- `document_preview_screen.dart` rewritten: takes the full `AppDocument`
  via route `extra` (not just an id) and fetches bytes through
  `DocumentRepository.fetchContent` — routed through the shared
  `ApiClient` so the auth interceptor attaches the bearer token
  automatically, replacing the old ad-hoc Firebase-token/`Image.network`
  approach. Renders images via `PhotoView`/`Image.memory` and PDFs via
  `pdfx`'s `PdfViewPinch` — both pinch-to-zoom.
- Home's Recent Documents rows are now tappable into preview (previously
  dead).
- **Verified end-to-end on-device**: camera capture upload, file-picker
  image upload, file-picker PDF upload (pushed a hand-built minimal PDF via
  `adb push`, selected via the native SAF "Choose a file" picker), image
  preview, PDF preview (rendered correctly), replace, delete — every one
  confirmed working with real device screenshots.

## 2. Loan wizard — validation + completed Review step

- `_LoanRequirementStepState` (`loan_application_flow_screen.dart`): amount
  and term now validated against the selected category's
  `minAmount`/`maxAmount`/`minTermMonths`/`maxTermMonths` client-side (was
  previously only a client-side round-trip discovered as a gap; the
  category bounds were already enforced backend-side). Verified on-device
  with a Home Loan (₹10,000, below the ₹5,00,000 floor) — exact error
  message rendered correctly.
- `_ReviewStep` rewritten as a `ConsumerWidget`: now shows every field
  actually collected — mother's name, PIN code, permanent address,
  designation, joining date, office address/phone, additional income,
  masked bank account/IFSC/holder name, credit card count/outstanding, both
  references (name/phone/relationship), and a documents-uploaded summary.
  Previously several collected fields were silently missing from review.
  Purely additive to the existing `_ReviewSection`/`_ReviewRow` pattern —
  no controller/state changes needed, since every field was already in
  `LoanApplicationFormState`.
- Verified on-device up through Step 9 (Documents) for a full fresh Home
  Loan application: prefill from profile, range validation, Nominee/
  References prefill, and the Documents step's existing required-document
  gate (Property Papers/Sale Agreement/Registry Document rendering
  correctly as Home-specific, multi-slot Salary Slip and Other Document
  rendering "N of 3 uploaded" correctly). **Review step itself (Step 10)
  was not visually reached on-device** — session was stopped mid-upload of
  the last required Home-specific document; logic is code-verified and the
  Documents-step gating (a pre-existing, unrelated feature) worked
  correctly right up to that point.

## 3. Home — dynamic Lending Partners (Flutter-only, per explicit instruction)

- No backend table/migration/endpoint added this sprint (explicitly
  deferred to a future Bank Portal/Admin Panel sprint). Instead: a real,
  fully-wired `LendingPartnerRepository`/`lendingPartnersProvider` that
  calls `GET /v1/lending-partners` and **fails soft to an empty list**
  today (the endpoint doesn't exist yet) — the day it ships, this section
  starts showing real partners with zero Flutter changes.
- `_LendingPartnersSection` rewritten: no more two fake greyed-out "Coming
  soon" bank tiles. Empty state is one premium, intentional
  "More lending partners coming soon" card (gold-accent icon, matches the
  existing design system's "premium touch" color usage); non-empty state
  renders a horizontal partner list (logo/rate/offer).
- Verified on-device — card renders correctly.

## 4. Profile — sign-out confirmation

- `profile_view_screen.dart`: sign-out now requires an `AlertDialog`
  confirmation (same shape as `documents_checklist.dart`'s existing
  `_confirmDelete`) before calling `signOut()` — previously a single
  accidental tap immediately ended the session with no recovery.
- Not yet re-verified on-device after this specific change (session ended
  before reaching Profile in the manual walkthrough) — code-reviewed only.

## 5. Two real Android issues found and fixed during on-device testing

**Issue 1 — build failure from the new `file_picker` dependency.**
`file_picker`'s transitive `flutter_plugin_android_lifecycle` dependency
requires `compileSdk 36`; this project's `compileSdk` (via
`flutter.compileSdkVersion`) resolved to 34 on the installed Flutter
version. Fixed two ways: bumped `file_picker` from `^8.1.2` to `^10.3.3`
(newer major, built against a compatible SDK) and set
`compileSdk = 36` explicitly in `android/app/build.gradle` (overriding the
Flutter-tool default, with a comment explaining why).

**Issue 2 — every network call silently failing on-device (the big one).**
Google Sign-In succeeded (confirmed via native Firebase Auth logs — "Notifying
id token listeners"), but the app never reached Home; it silently bounced
back to the Sign-in screen. Root cause: Android blocks cleartext (plain
`http://`) traffic by default for apps targeting API 28+, and the manifest
had no allowance for it — so the wizard's `POST /v1/auth/session` (and
every other API call) failed at the OS network layer before ever opening a
socket, with **zero trace in backend logs** (confirmed via `adb shell curl`
against the same URL succeeding, and `ping` failing due to Windows Firewall
blocking ICMP specifically — ruled out as a red herring). Fixed by adding
`android:usesCleartextTraffic="true"` to
`android/app/src/debug/AndroidManifest.xml` only (debug-only — production/
staging use `https://` and get no such allowance, matching
`env/production.json`/`env/staging.json`). This had been silently broken
for the device-testing workflow this whole time; not caused by this
sprint's changes, but only surfaced once a real sign-in flow was driven
end-to-end on a fresh install.

## 6. Final verification (all green, twice — once mid-session, once at checkpoint)

- `cd apps/backend && npm run typecheck && npm run build` — clean.
- `cd apps/customer-app && flutter analyze` — no issues.
- `cd apps/customer-app && flutter test` — all tests pass.
- Note: an earlier `dart format .` pass reformatted the entire repo due to a
  Dart SDK/dart_style version mismatch between the local toolchain and
  whatever the repo was last formatted with (CI pins Flutter 3.24.0; local
  is 3.44.6) — reverted everything except the files actually touched this
  sprint, to keep the diff scoped. Worth noting for whoever next runs
  `dart format` locally: expect wide reformatting noise unless using a
  matching SDK version.

## Known dev-DB clutter (carried over, still not cleaned up)

Same duplicate test loan applications from 2026-07-15 remain (one Home
Loan, one Business Loan, two Personal Loans). This session added no new
test loan applications (only got partway through one on-device Home Loan
attempt that was never submitted — abandoned at the Documents step).

---

# Work Summary — 2026-07-15

Session scope: Customer App production sprint, continued across two parts —
(1) persistent bottom navigation + design-system polish, (2) a phased
"demo → production-grade Indian Loan Marketplace" push covering the full
10-step loan application wizard and a catalog-driven Document Manager,
finishing with a full device verification pass that caught and fixed two
real production bugs.

Backend (`apps/backend`), Customer App (`apps/customer-app`), and
`packages/shared-flutter` all touched. Nothing committed yet — see
`git status` for the full uncommitted diff (this file's own history has a
"Remaining tasks" note on that).

## 1. Bottom navigation (Sprint 1)

- Persistent bottom nav via `StatefulShellRoute.indexedStack`, 4 tabs: Home,
  Loans, Documents, Profile — each tab keeps its own navigation stack.
- New: `core/navigation/app_shell.dart`, `core/widgets/page_transitions.dart`,
  `core/widgets/hero_card.dart`, `core/widgets/section_header.dart`,
  `core/widgets/fade_slide_in.dart`, `core/widgets/animated_currency.dart`,
  `core/constants/category_style.dart`.
- Verified on-device: every tab, back navigation, Android system back button —
  no duplicate screens or routing bugs.

## 2. Sprint 2 Phase 1 — UI polish + full application wizard

Backend (additive, one migration):

- `1783772100000-ExtendCustomerProfileForApplicationForm.ts` — ~24 nullable
  columns on `customer_profiles` (personal, address, employment, income,
  existing-obligations, nominee phone, two references).
- Wired through existing `CustomerProfileEntity` →
  `UpdateCustomerProfileDto` → `CustomerProfileResponseDto` →
  `CustomersService.upsertOwnProfile` — no new endpoints, no breaking change
  to `PATCH /v1/customers/me`.

Frontend:

- New `core/constants/application_wizard_steps.dart` — `WizardStep` enum +
  `stepsForCategory(categoryId)`, tailoring the step sequence per loan
  category (Gold/Vehicle skip reference/EMI-obligation checks; Education
  skips existing-loan checks; Personal/Home/Business get the full 10 steps).
- `loan_application_flow_controller.dart` and `loan_application_flow_screen.dart`
  rewritten: 10 step widgets, pre-fill from `profileOverviewProvider`, compact
  scrollable step-progress indicator.
- Home, Profile, Loan Details, Application Details screens polished (hero
  card color-contrast fix, "Loans for you" overflow fix, DEV badge removed,
  Recent Documents section, animated status timeline).

Verified: backend typecheck/build, `flutter analyze`/`flutter test`
(caught one real bug — sorting a `const` empty-list fallback threw
`UnsupportedError`, fixed), device walkthrough of the full wizard per
category.

## 3. Sprint 2 Phase 2 — Catalog-driven Document Manager

Replaced the old hardcoded 6-type document enum with a data-driven catalog,
per the user's explicit architectural rules (no hardcoded types, DB-config
new types without code changes, admin-manageable, backward compatible).

Backend:

- Two migrations: `1783772200000-CreateDocumentTypesCatalog.ts` (new
  `document_types` table, ~22 seeded rows across 6 categories) and
  `1783772300000-ExtendDocumentsForCatalog.ts` (adds `document_type_code`,
  `slot_index`, `label` to `documents`, backfills from the legacy enum).
- New `DocumentTypeEntity`, `document-type.repository.ts`,
  `document-types.service.ts` (admin CRUD), `document-types.controller.ts`
  (`@Auth(UserRole.ADMIN)`).
- `documents.service.ts` rewritten: `getOverview(user, categoryId?)`,
  slot-aware `upload()`, new `delete()`.
- `documents.controller.ts`: `GET /v1/documents?categoryId=`, `POST` with new
  DTO, new `DELETE /v1/documents/:id`.
- Legacy `document_type` enum column kept and populated for backward
  compatibility — zero data migration risk (seeded catalog codes are
  byte-identical to the old enum values).

Frontend:

- `core/models/document.dart` rewritten (`AppDocument`, `DocumentSlot`,
  `DocumentTypeOverview` with `isComplete`/`uploadedCount`,
  `DocumentCategory`, `DocumentsOverview`).
- `documents_checklist.dart` rewritten — fully catalog-driven: category
  sections, per-type cards, multi-slot rows (e.g. Salary Slip 1/2/3),
  Required/Optional badges, upload/replace/delete/preview, upload progress.
- New `core/constants/document_category_style.dart` for per-category
  icon/color.
- The wizard's Documents step (`_DocumentsStep`) embeds this same widget,
  scoped by `categoryId` so category-specific documents (e.g. Home's
  Property Papers/Sale Agreement/Registry) appear automatically.

## 4. Device verification pass — two real bugs found and fixed

Full device walkthrough (multi-slot upload, replace, delete, preview,
wizard category filtering) surfaced two genuine production bugs:

**Bug 1 — silent upload failures.** `UploadDocumentDto.slotIndex` used
`@IsInt()` with no `@Type(() => Number)`. Multipart form-data sends every
field as a string, so class-validator rejected `slotIndex` and NestJS
returned a validation error as `message: string[]` — but the Flutter
`ApiClient._extractMessage()` only handled `message: string`, so every
upload failed with a generic, unhelpful "Request failed." Fixed both sides:

- `apps/backend/src/documents/dto/upload-document.dto.ts` — added
  `@Type(() => Number)`.
- `packages/shared-flutter/lib/src/network/api_client.dart` —
  `_extractMessage` now also joins NestJS's `string[]` validation-error
  format, so future validation errors surface their real message.

**Bug 2 — loan applications submittable with zero required documents.**
The wizard's Documents step let the applicant tap Continue (and ultimately
Submit) with no validation at all. Confirmed via direct DB query: a Home
Loan application for ₹5,00,000 was successfully submitted with 8 of 9
required documents missing, including all 3 Home-specific ones (Property
Papers, Sale Agreement, Registry Document). Fixed in
`apps/customer-app/lib/features/loans/loan_application_flow_screen.dart` —
`_DocumentsStep` now watches `documentsOverviewProvider(categoryId)` and
disables Continue (with a clear inline message) until every required
document type for that category is uploaded. Verified two ways on-device:
Continue is enabled once all required docs are genuinely on file, and
`enabled="false"` in the accessibility tree when a category-specific
requirement (Gold Valuation Certificate) is still missing.

Both fixes required a full app rebuild + reinstall to take effect (Dart
source edits don't hot-reload into an already-installed release/debug APK
without an attached `flutter run` session) — rebuilt via
`flutter build apk --debug --dart-define-from-file=env/development.json`
and `adb install -r`. First rebuild attempt omitted the dart-define flag and
defaulted to `localhost`, breaking connectivity from the physical device;
corrected on the second build.

## 5. Final verification (all green)

- `cd apps/backend && npm run typecheck && npm run build` — clean.
- `cd apps/customer-app && flutter analyze` — no issues.
- `cd apps/customer-app && flutter test` — all tests pass.
- Device walkthrough: Documents tab (all 6 categories), multi-slot
  upload/replace/delete/preview, wizard category-specific document
  filtering (Personal and Gold categories both walked end-to-end).

## Known dev-DB clutter (not cleaned up per instruction)

Several duplicate test loan applications were submitted to the local dev
Postgres database during the confused early part of the device-verification
session, before Bug 2's fix was actually deployed to the device (one Home
Loan, one Business Loan, two Personal Loans, all using the same test
customer). Harmless dev-only data — flagged here rather than deleted, since
today's instructions were explicitly not to touch test data.

## Remaining / uncommitted

- **Nothing from today (or the prior 2026-07-14 session) is committed** —
  see `git status` for the full list of modified/untracked files. Decide on
  a commit strategy before starting new work next session.
- See `TODO_NEXT_SESSION.md` for the prioritized next-session list.
