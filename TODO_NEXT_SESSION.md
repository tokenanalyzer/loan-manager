# TODO — Next Session

## 0. First thing: decide how to commit today's work
Nothing from this session is committed — 75 files of uncommitted changes are
sitting in the working tree (`git status` / `WORK_SUMMARY.md` has the full
list). Before starting new work, agree on a commit strategy:
- One commit per phase (Google Sign-In → India-localization → premium
  redesign), or
- One squashed commit for the whole session.
Either way, review `git diff` for anything unexpected before committing —
nothing suspicious was found this session, but re-verify with fresh eyes.

## 1. Employee-app parity gaps
- Add bank account / nominee fields to `apps/employee-app/lib/core/models/customer_profile.dart`
  and the customer-detail screen, mirroring what customer-app already has —
  currently staff can't see this data at all.

## 2. Roadmap (per user's stated direction)
Now that the Customer App is at production quality, the stated next phases are:
1. **DSA App** — loan officer / agent-facing app for sourcing applications.
2. **Bank Portal** — where real partner banks/lenders actually onboard. This
   is also what unblocks turning the Home screen's "Lending Partners" section
   from honest placeholders into real data (no redesign needed there — it's
   a data change once this exists).
3. **Super Admin Panel** — builds on the existing `apps/admin-panel` (React),
   out of scope this session.

Recommend starting with whichever of these has the clearest existing backend
surface — likely the DSA App, since `loan-applications` and `customers`
modules already exist and mostly need a staff-scoped view/flow rather than
new domain modules.

## 3. Deferred product/compliance work
- **CIBIL / credit bureau integration** — the Home screen's "Credit Profile"
  card deliberately uses an honest "Profile Strength" meter instead of a real
  score. Real CIBIL integration is a distinct vendor + compliance workstream
  (data-sharing agreements, consent flows) — scope separately when prioritized.
- **Payments/repayment tracking** — loans currently model disbursement but
  not the repayment schedule or collections. Needed before "EMI Summary"
  can show real due dates / paid-vs-outstanding rather than just the
  computed schedule.
- **Category-specific collateral documents** — Gold Loan (jewelry appraisal)
  and Home Loan (property documents) need their own document-type
  requirements; currently all categories share the same document checklist.

## 4. Architecture backlog
See `docs/architecture-review-2026-07.md` (written this session) for the
fuller list — worth a read before the DSA App/Bank Portal work starts, since
several items there (product catalog table, staff provisioning, notification
fan-out) are foundational to those apps:
- Product catalog table (vs. hardcoded `LOAN_CATEGORY_BOUNDS`) — matters more
  once a Bank Portal needs per-lender rate cards.
- Staff provisioning gap (how DSA/bank/admin users get created — no flow
  exists yet).
- Pagination on list endpoints (applications, notifications) — fine at demo
  data volumes, will matter once a DSA app lists all customers' applications.
- Notification fan-out is currently single-producer; revisit if the DSA App
  needs to trigger notifications too.
- Storage service abstraction for documents (currently local-disk assumed).

## 5. Testing follow-ups
- All automated checks were green at end of session (backend
  typecheck/lint/test, `flutter analyze`/`flutter test` for shared-flutter,
  customer-app, employee-app) — re-run these first thing next session to
  confirm the working tree is still in the same state before continuing.
- No live-device walkthrough has been done for the **employee-app** KYC
  verify/reject UI added this session — worth a quick manual pass before
  building further on top of it.
