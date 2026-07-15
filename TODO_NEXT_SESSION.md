# TODO — Next Session

## 0. First thing: decide how to commit the accumulated work
Nothing across the last two sessions (2026-07-14 and 2026-07-15) is
committed — `git status` shows the full uncommitted diff spanning Google
Sign-In, India localization, the premium Customer App redesign, bottom
navigation, the full 10-step application wizard, and the catalog-driven
Document Manager. Before starting new work:
- Review `git diff` with fresh eyes for anything unexpected.
- Agree on a commit strategy (logical commits per feature area vs. a small
  number of larger ones) — this is a lot of work to land as one commit.
- Re-run the full check suite first (see §5) to confirm the working tree is
  still green before committing anything.

## 1. Dev-DB cleanup (optional, low priority)
Several duplicate test loan applications exist in the local dev Postgres
from device-testing mistakes on 2026-07-15 (one Home Loan ₹5,00,000, one
Business Loan ₹10,00,000, two Personal Loans). Harmless, but worth deleting
before demoing the app so "Recent activity"/"Active applications" don't look
cluttered. Left untouched intentionally this session per explicit
instruction not to modify test data.

## 2. Immediate follow-ups from today's bug fixes
- The Documents-step required-document gate (fixed 2026-07-15 in
  `loan_application_flow_screen.dart`) is a **client-side** check only. The
  backend's `LoanApplicationsService`/`DocumentsService` submit path still
  has no server-side enforcement that required documents exist before a
  loan application can move to `submitted`. Low urgency (only one client
  exists today), but worth closing before any second consumer of the submit
  endpoint appears (DSA App, admin resubmission flow, etc.) — otherwise the
  same bug reappears one layer down.
- No live-device walkthrough has been done for the **employee-app** side of
  the new document catalog — it still points at whatever the old
  hardcoded-enum document endpoints returned. Confirm whether employee-app
  reads `documents` at all; if so, it needs the same catalog-aware update.
- Admin CRUD for `document_types` (`document-types.controller.ts`,
  `@Auth(UserRole.ADMIN)`) was built this session but has no UI anywhere
  yet (no admin-panel screen). Fine for now since new types are single-row
  DB inserts in the interim, but flag if the admin panel work starts.

## 3. Employee-app parity gaps (carried over from 2026-07-14)
- Add bank account / nominee fields to
  `apps/employee-app/lib/core/models/customer_profile.dart` and the
  customer-detail screen, mirroring what customer-app already has — staff
  currently can't see this data at all.
- No live-device walkthrough has been done for the employee-app KYC
  verify/reject UI added 2026-07-14 — worth a quick manual pass.

## 4. Roadmap (per user's stated direction)
Customer App is now at production quality (bottom nav, full application
wizard, catalog-driven documents, verified end-to-end). Stated next phases:
1. **DSA App** — loan officer / agent-facing app for sourcing applications.
   Likely the best starting point: `loan-applications`, `customers`, and now
   `documents` all already have real backend surfaces: mostly needs a
   staff-scoped view/flow rather than new domain modules.
2. **Bank Portal** — where real partner banks/lenders onboard. Also what
   unblocks turning the Home screen's "Lending Partners" section from
   honest placeholders into real data (data change only, no redesign
   needed once this exists).
3. **Super Admin Panel** — builds on the existing `apps/admin-panel`
   (React), out of scope so far. Would also be the natural home for a
   document-types catalog management UI (see §2).

## 5. Testing follow-ups
Before continuing, re-run and confirm all green (all passed at the end of
the 2026-07-15 session):
- `cd apps/backend && npm run typecheck && npm run build`
- `cd apps/customer-app && flutter analyze && flutter test`
- Backend dev server was stopped at end of session
  (`npm run dev` / `nest start --watch`) — restart it before resuming
  device testing: `cd apps/backend && npm run dev`.
- The customer-app device build installed 2026-07-15 has both bug fixes
  live; no rebuild needed unless further Dart changes are made (Dart source
  edits do **not** hot-reload into an installed APK without an attached
  `flutter run` session — rebuild via
  `flutter build apk --debug --dart-define-from-file=env/development.json`
  then `adb install -r` if the device needs updating again).

## 6. Deferred product/compliance work (carried over)
- **CIBIL / credit bureau integration** — Home screen's "Credit Profile"
  card deliberately uses an honest "Profile Strength" meter, not a real
  score. Separate vendor + compliance workstream.
- **Payments/repayment tracking** — loans model disbursement but not
  repayment schedule/collections.
- See `docs/architecture-review-2026-07.md` for the fuller architecture
  backlog (product catalog table, staff provisioning, pagination,
  notification fan-out, storage service abstraction).
