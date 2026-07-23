# TODO — Next Session

State as of 2026-07-23 (end of session). Replaces the 2026-07-21 snapshot —
see git history if you need it verbatim. Companion document:
`docs/PRODUCTION_DEPLOYMENT_CHECKPOINT.md` — the detailed, authoritative
record of exactly what exists in GCP right now. Read that before touching
any cloud resource.

## 0. Commit/push status — resolved

Everything from today's session is committed and pushed to `origin/main`
(working tree clean, in sync with origin as of this checkpoint). Backend
Jest suite and `flutter analyze` (customer-app) both pass cleanly.

## 1. Completed today (2026-07-23)

- **Fixed the notification → Documents → crash bug** (`context.push` to a
  `StatefulShellRoute` tab root corrupting GoRouter's page stack) — root
  cause traced end-to-end from DB → API → admin action → notification →
  Customer App, fixed, and verified live on a physical device (reject a
  document via Admin Panel → notification arrives → tap → Replace → upload
  succeeds, no crash).
- **Admin Panel audit completed** — full backend-endpoint-to-UI coverage
  matrix, gap checklist, and a prioritized 4-tier roadmap. Explicitly
  **not implemented** — Admin Panel work stays frozen until the Customer
  App is production-ready and frozen, per explicit instruction.
- **Traced a customer-contact-data question end-to-end** — confirmed the
  mobile number is not lost anywhere in the DB→API→DTO→Frontend chain;
  the real gap is upstream (Google-only sign-ins never collect a phone
  number, no in-app way to backfill one). Found one genuine, separate gap
  while tracing this: **Loan ID is never displayed on the Admin Panel's
  Lead Details page** — not yet fixed (Admin Panel frozen).
- **Committed 9 previously-uncommitted files** from earlier work, each
  independently verified as a real fix: Android back-gesture crash at
  shell tab roots, cold-start double-GoRouter-redirect race, profile-edit
  validation-scroll-into-view, profile-view text overflow, backend
  notification-recipient routing on re-upload/query-response.
- **Required-document validation at loan submission** (backend) — the
  approved Phase-1 release blocker. New `getMissingRequiredDocumentsForSubmission`
  (presence-only check, distinct from the stricter `verified`-status
  approval-time gate, which is unchanged and remains the second safety
  layer). Unit-tested; verified live with real Business Loan and Vehicle
  Loan submissions.
- **Found and fixed a real regression during QA**: the earlier back-gesture
  crash fix had (incorrectly) routed every hardware back-press through a
  raw `appRouter.pop()`, bypassing every in-route `PopScope` in the app —
  silently undoing the wizard's existing step-back protection. Caught by
  deliberately testing the wizard's back button mid-flow, not by code
  review alone. Fixed properly: only the actual "nothing to pop" crash
  case is special-cased now; everything else falls through to the
  standard, PopScope-respecting path.
- **Android release signing** — generated a real production upload
  keystore, wired `build.gradle`, verified with `apksigner` that release
  builds are actually signed with it (not debug).
- **Production deployment plan** — pivoted from an earlier Railway
  recommendation to **Google Cloud + Firebase** per explicit direction.
  Full architecture plan (Cloud Run, Cloud SQL, GCS-mounted-volume
  approach for documents, Secret Manager, domain/SSL, logging/monitoring,
  cost estimate) written and approved.
- **GCP production infrastructure — started, paused after Cloud SQL.**
  See §2 below and `docs/PRODUCTION_DEPLOYMENT_CHECKPOINT.md` for exact
  detail.
- **Signed Release APK delivered today** — production keystore, pointed
  at the local dev backend (not production) for immediate use, since GCP
  deployment is mid-flight. `apps/customer-app/build/app/outputs/flutter-apk/app-release.apk`.

## 2. Current production infrastructure status

**Read `docs/PRODUCTION_DEPLOYMENT_CHECKPOINT.md` for full detail.** Headline:

- GCP project `loan-manager-india` (660520519709) — the same project the
  Firebase project already lives in, reused deliberately, billing enabled.
- 12 APIs enabled (10 originally approved + Compute Engine + Service
  Networking, approved separately once private networking needed them).
- VPC networking complete: custom VPC, subnet, private-services peering —
  all created and verified.
- **Cloud SQL instance `loan-manager-prod-db` exists and is RUNNABLE** —
  PostgreSQL 16, asia-south1, `db-custom-1-3840`, private IP only, backups
  + PITR + deletion protection all on. **No database, user, or password
  created on it yet — deliberately deferred.**
- Nothing else exists yet: no Cloud Storage bucket, no Secret Manager
  secrets, no Cloud Run service, no domain mapping, no production Firebase
  service account, release keystore's SHA-1/SHA-256 not yet registered in
  Firebase console.

## 3. Remaining production deployment tasks — exact resume order

The user's stated order, unchanged:

1. **Cloud Storage** — create the documents bucket, mounted as a Cloud Run
   volume (`UPLOADS_DIR` points at the mount path — zero application code
   changes; `LocalDiskStorageService` keeps working as-is). This is a
   deliberate bridge, not the real `FirebaseStorageService` integration,
   which stays deferred (see §5).
2. **Secret Manager** — create secrets for `DATABASE_URL` and a
   **production-dedicated** Firebase Admin service account (generate a
   fresh one in Firebase Console — don't reuse the local-dev key).
3. **Cloud SQL database + user** — create the application database and a
   least-privilege user/password on the already-existing instance.
4. **Cloud Run deployment** — deploy the backend container. Remember:
   `main.ts` reads `BACKEND_PORT` (default 3000), Cloud Run needs
   `BACKEND_PORT=8080` set explicitly and `--port=8080` at deploy time —
   this was already identified as a gap in the approved plan, not yet applied.
5. **Register the release keystore's fingerprints in Firebase Console** —
   still a manual, user-only step (Project Settings → your Android app →
   Add fingerprint). SHA-1/SHA-256 are in
   `C:\Users\Administrator\LoanManagerSigning\customer-app\keytool-output.log`.
6. **Domain mapping + SSL** for the Cloud Run service (automatic managed
   cert once mapped).
7. **Update Customer App `env/production.json`** — real API domain,
   `FIREBASE_ENABLED=true`, real project ID — once the domain exists.
8. **Verify the deployed production backend** — smoke test before pointing
   a real release build at it.
9. **Build + verify a production Release APK** on a physical device —
   full flow: login, application, document upload, rejection, re-upload,
   notifications, approval workflow — against the real production backend.
10. **Freeze the Customer App.**
11. Only then: begin the Admin Panel roadmap (already audited and
    planned — see the published artifact from this session — but
    explicitly not started).

## 4. Exact next step for the next session

**Create the Cloud Storage bucket** (documents, GCS-mounted-volume
approach for Cloud Run) — the first item in §3's list. Everything needed
to do this (VPC, APIs, region choice) already exists; nothing is blocking
it.

## 5. Known, deliberately-deferred architectural items (unchanged from before)

- Firebase Storage is not integrated as a real `StorageService`
  implementation — the Cloud Storage bucket being created next session is
  a mounted-volume bridge, not this. `LocalDiskStorageService` stays the
  actual implementation.
- **Rewards System** — fully designed, explicitly not implemented.
  Revisit when the user says so.
- Admin-facing "list everything" endpoints still have no pagination —
  fine at current data volume, an API-contract change for later.

## 6. Corrections to prior versions of this file

- **Loan Against Property (LAP) is NOT deferred — it's live.** A prior
  version of this file said LAP was "explicitly deferred." That was
  stale: `kLoanCategories`, `LOAN_CATEGORY_BOUNDS.lap`, the
  `propertyDetails` wizard step, and the `property_documents` catalog
  entry are all live and were exercised successfully in this session's QA
  (a real LAP-adjacent Vehicle Loan application submitted end-to-end with
  no issue). Treat LAP as a normal, supported category.
- **Release signing is done** (was listed as still-needed — see §1).

## 7. Known limitations

- No automated test coverage beyond a handful of unit/widget smoke tests
  plus the two new Jest suites added this session (submission gate,
  notification-recipient routing).
- **CIBIL/credit bureau integration** — Home's "Credit Profile" card uses
  an honest "Profile Strength" meter, not a real score. Separate vendor/
  compliance workstream.
- **Payments/repayment tracking** — loans model disbursement but not a
  repayment schedule/collections.
- **Dev-DB test data cleanup still not done.** This was approved as a
  Phase 1 release-blocker item but not yet executed — and this session's
  QA added *more* test applications (a Business Loan and a Vehicle Loan)
  on top of what was already there. Do this before any demo, and before
  it's forgotten entirely.
- Manual QA on the remaining loan categories (Home, Education, LAP edge
  cases) was handed off to the user mid-session ("all test pass manually
  already") — not independently re-verified by Claude. Worth a sanity
  check if anything looks off in those categories later.

## 8. Roadmap (unchanged, still not started)

Beyond production deployment and the Admin Panel roadmap: **DSA App**
(loan officer/agent-facing app), **Bank Portal** (real partner bank
onboarding), **Super Admin Panel** (builds on `apps/admin-panel`). See
`docs/MASTER_PRODUCT_SPEC.md` — the frozen single source of truth for
anything beyond this file's immediate scope.
