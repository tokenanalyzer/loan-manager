# TODO — Next Session

State as of 2026-07-21. This file replaces both prior versions (2026-07-16/17
and 2026-07-20 snapshots, reconciled during today's merge) — see git history
if you need either one verbatim.

## 0. Commit/push status — resolved

Today's full session (document OR-groups, LAP groundwork, a platform-wide
production-readiness audit and fixes across Customer App/Backend/Admin
Panel/Employee CRM, and reconciling with the separately-merged
`worktree-expressive-wibbling-torvalds` PR) is committed and pushed to
`origin/main`. `flutter analyze` (both Flutter apps), the backend Jest suite,
`tsc --noEmit` (backend/shared-types/admin-panel), and a real admin-panel
production build all pass cleanly as of this checkpoint.

## 1. The "unexpected loan submission" mystery (2026-07-20) — likely resolved, not yet confirmed

A "Personal Loan submitted, ₹10,00,000.00" entry appeared on a customer's
Home screen after a single Android back-button press, with no form
submitted. Today's audit found and fixed the actual, reproducible cause of
this class of bug: `LoanApplicationFlowScreen` had no `PopScope`, so
Android's hardware back button popped the *entire wizard route* from any
step instead of stepping back one page (now fixed — mirrors `AppShell`'s
existing `PopScope` pattern). This doesn't prove that specific incident was
this bug (rule out via `audit_log`/`loan_applications.created_at` for that
customer if it recurs), but it's the most likely explanation and is now
fixed regardless.

## 2. Phone Authentication — **frozen, do not touch**

Approved and frozen 2026-07-21 after a full audit (see project memory
`project_phone_auth_frozen.md`). The `https://loan-manager-india.firebaseapp.com/...`
browser/Custom-Tabs step during OTP is Firebase's own documented security
fallback (confirmed via Firebase's own docs + our resolved Gradle dependency
tree — `androidx.browser` is a direct dependency of `firebase-auth` itself,
not our code), triggered because the app is currently sideloaded rather than
Play-Store-distributed. SHA-1 and SHA-256 are both correctly registered.
**Do not re-investigate or modify** this module unless a reproducible issue
appears after installing via a real Google Play Internal Testing build.

## 3. Manual/external tasks still needed before a real production launch

- **Google Play Internal Testing build** — needed to confirm Phone Auth's
  browser fallback disappears as expected (see item 2).
- **Release signing** — the current APK is debug-signed; a real release
  keystore + its SHA registered in Firebase Console is still needed.
- **Real production environment values** — `env/staging.json`/
  `env/production.json` (both Flutter apps) still have placeholder API
  domains; backend `CORS_ORIGIN` needs a real production origin once those
  domains exist.
- **Employee App's own Firebase registration** — it has no `google-services.json`/
  `GoogleService-Info.plist` of its own yet (separate Android package/iOS
  bundle id from the Customer App); Email/Password sign-in needs confirming
  as enabled for it.
- **Full manual click-through** with a real phone number for OTP — everything
  short of that has been verified (static analysis, live logcat on a real
  device, one real-device install/launch session), but a true end-to-end
  human pass is still worth doing.

## 4. Known, deliberately-deferred architectural items

- Admin-facing "list everything" endpoints (all loan applications, all
  customers, all unassigned leads) have no pagination yet — fine at current
  data volume, a real concern at production scale. Fixing this properly is
  an API contract change needing coordinated backend + admin-panel work, not
  a quick patch — noted, not fabricated as a quick fix.
- The Documents-step required-document gate is enforced server-side at
  **approval** time (`LoanApplicationsService.review`'s blocking-documents
  check) but not at **submission** time — a customer can still submit an
  application with zero documents uploaded; the requirement only blocks the
  employee/admin from approving it later. Low urgency with one client today,
  worth closing before a second submit-endpoint consumer appears.
- Firebase Storage is not integrated — documents are stored on local disk
  (`LocalDiskStorageService`); a real Storage bucket already exists on the
  Firebase project but nothing uses it yet. Deliberately deferred, not an
  oversight.
- Loan Against Property (LAP) as a full new loan category (its own
  `LOAN_CATEGORY_BOUNDS` entry, `kLoanCategories` entry, UI/routing) was
  explicitly deferred — see the local Rewards/LAP planning notes from
  2026-07-21 for the already-designed shape; the OR-group document-catalog
  work landed today is what makes adding it later a config-only change.
- **Rewards System** — fully designed (backend module, admin management UI,
  customer app feature) but explicitly not implemented; the plan exists only
  as a local Claude Code plan file from today's session, not committed
  anywhere in-repo. Revisit when the user says so.

## 5. Roadmap (per user's stated direction, still not started)

Beyond the items above, the stated next phases are: **DSA App** (loan
officer/agent-facing app), **Bank Portal** (real partner bank onboarding),
**Super Admin Panel** (builds on `apps/admin-panel`). See
`docs/MASTER_PRODUCT_SPEC.md` — the frozen single source of truth for
anything beyond this file's immediate scope.

## 6. Known limitations (updated — some of these were stale)

- Firebase **is** a real, configured project (`loan-manager-india`) for the
  backend and Customer App dev tier — this line was stale in prior versions
  of this file. What's still genuinely missing is covered in §3 above.
- No automated test coverage beyond a handful of unit/widget smoke tests.
- **CIBIL/credit bureau integration** — Home's "Credit Profile" card uses an
  honest "Profile Strength" meter, not a real score. Separate vendor/
  compliance workstream.
- **Payments/repayment tracking** — loans model disbursement but not a
  repayment schedule/collections.
- Dev-DB has a handful of duplicate test loan applications from earlier
  sessions — harmless, worth clearing before demoing so "Recent activity"
  doesn't look cluttered. Still untouched intentionally.
