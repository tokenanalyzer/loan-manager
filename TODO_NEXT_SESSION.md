# TODO — Next Session

Next session's stated focus, in order: **investigate the unexpected loan
submission found during today's (2026-07-20) testing, finish Customer App
manual testing, then move on to Admin Panel / Employee CRM testing.**

## 0. Commit/push status
Everything through 2026-07-20 is committed to `main` (5 commits, see
`WORK_SUMMARY.md`) but **not pushed** — `origin/main` has 3 commits this
branch doesn't have yet, so a pull/merge (or rebase) is needed before
pushing. No known conflict expected, but verify before pushing.

## 1. Investigate the unexpected loan submission bug (top priority — deferred from today)
During on-device verification of the new direct-to-form flow, a **"Personal
Loan submitted, ₹10,00,000.00"** entry appeared on the customer's Home
screen immediately after a single Android system-back-button press — no
form fields were filled or submitted by the automation driving the phone.
`Active applications` and the credit-profile completion percentage changed
at the same moment.
- Leading hypothesis (unconfirmed): the phone was in concurrent use by
  someone/something else at the time (a different, unrelated app was also
  observed briefly in the foreground during an earlier tap in the same
  session) — i.e. this may not be an app bug at all, but a real submission
  made by a person physically using the device mid-test.
- Rule this in or out first via the backend/database (see item 3) before
  assuming it's a code defect.
- If it turns out to be real: check whether `LoanApplicationFlowController`
  state can retain stale/partial data across navigation in a way that a
  back-press could trigger an unintended `submit()` call — start at
  `loan_application_flow_screen.dart`'s `_ReviewStep._submit` and the
  controller's provider lifecycle (is it `autoDispose`? does the app
  process actually restart between `adb install -r` and `adb shell am
  start`, or can an old process/task be resumed with stale in-memory
  state — `am start` reported "Activity not started, its current task has
  been brought to the front" during today's session, meaning the existing
  task was resumed rather than cold-started).

## 2. Audit navigation / back-button behavior
Related to item 1: confirm exactly what Android's system back button does
at each step of the loan application wizard (`loan_application_flow_screen.dart`),
particularly on step 1 where the in-app back arrow is intentionally `null`
(`state.isFirstStep`). Confirm it only pops the route to Home and can never
advance/submit the wizard.

## 3. Verify backend/database state
Query the dev database directly (`apps/backend` has the `pg` package
already set up for this — see today's session for the working connection
pattern) for customer "Zainul" (`id 6badf8fe-1813-447e-8a32-b5b29c08b216`):
confirm whether a real `loan_applications` row for ₹10,00,000 (Personal
Loan) now exists, its `created_at` timestamp, and cross-check against
`audit_log` for who/what created it. This determines whether item 1 is a
real code bug or an actual user action.

## 4. Complete remaining Customer App manual testing
Continuing today's on-device verification (which only reached the Personal
Loan quick-apply card):
- Confirm the direct-to-form flow for the other 5 loan categories (Home,
  Business, Education, Vehicle, Gold), from both entry points (Loans tab
  grid and Home's Quick Apply row).
- Confirm the document-upload step works end-to-end (this was the original,
  still-unresolved verification goal from earlier in the week — an
  ambiguous "documents needed" count change and a black screenshot were
  seen then, unrelated to today's UI change).
- Walk a full application through to submission at least once and confirm
  it appears correctly in the Admin Panel / Employee Portal.
- Re-verify the Legal module's 7 pages on-device (code-reviewed only so
  far, per Sprint 1).

## 5. After Customer App testing is complete: Admin Panel + Employee CRM
Move on to manually testing the Sprint 1 admin-panel/employee-portal
changes: admin-reachable `/leads/:id` routing, Work Status UI (break
overlay/force-resume banner) for employees, the standardized document
actions (Full Screen View, Request Re-upload, "Waiting for Customer"
banner), and the approval validation gate (attempt to approve an
application with an unverified required document and confirm it's
blocked with the correct `blockingDocuments` message).

## 6. Known limitations (carried over, still true)
- `apps/customer-app/env/production.json` has `FIREBASE_ENABLED: false`
  with no real project ID — must be a real, configured Firebase project
  before actual production release.
- No automated test coverage beyond a handful of unit/smoke tests.
- **CIBIL/credit bureau integration** — Home's "Credit Profile" card uses
  an honest "Profile Strength" meter, not a real score. Separate vendor/
  compliance workstream.
- **Payments/repayment tracking** — loans model disbursement but not
  repayment schedule/collections.
- Full target-state roadmap (DSA App, Bank Portal, Super Admin Panel) is in
  `docs/MASTER_PRODUCT_SPEC.md`, now the frozen single source of truth —
  prefer it over this file for anything beyond the immediate next session.
