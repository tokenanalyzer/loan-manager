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
