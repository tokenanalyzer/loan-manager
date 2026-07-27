# Admin Panel — Implementation Progress

Tracks the module-by-module evolution of the Admin Panel into the
Business Operating System described in the approved UI/UX Master
Blueprint. One module per entry, in build order.

## Module 1 — Staff Account Provisioning ✅ 2026-07-25

**What:** Admins can create and list employee/admin accounts from the
UI (`Settings → Team`), replacing the previous process of inserting
rows directly against the database. Closes the operational blocker
identified in the Admin Panel audit.

**Backend:**
- `POST /v1/users` / `GET /v1/users` (admin-only, paginated) —
  `apps/backend/src/users/{users.controller,users.service}.ts`
- `UserEntity` gains `invitedAt`/`activatedAt` — migration
  `1783774100000-AddStaffProvisioningFields`
- `AuthService.syncFromFirebaseToken` gains a pending-staff-invite
  linking check, additive-only, ahead of the unchanged customer-creation
  path — see the approved six-condition linking-safety rule, covered by
  7 dedicated tests in `auth.service.spec.ts`

**Frontend:** `apps/admin-panel/src/features/settings/` (`StaffListPage`,
`CreateStaffModal`, `staff-api`) — built entirely from existing shared
primitives (`PageContainer`, `TableContainer`, `Modal`, `FormLayout`,
`Button`, state components). No new UI primitives introduced.

**Cross-check performed:** verified against the Customer App's actual
sign-in flow before implementation — the shared `POST /v1/auth/session`
contract is unchanged, so no Customer App code required a change. Full
reasoning in the PR/commit discussion.

**Verification:** backend typecheck/lint/build/tests all pass (40/40,
including the 7 new linking-safety tests); admin-panel typecheck/lint/build
all pass; dark/light token compatibility and responsive behavior verified
at the code level (existing, already-verified shared primitives and
tokens only — no new ones introduced).

**Deliberately deferred to later modules:** Document Types admin UI,
Rewards Config UI (both nominally "Settings" but functionally separate),
the full `DataTable` primitive (this screen's table doesn't need it yet).

---

## Module 2 — Admin Authentication (in progress, phase 5 of 7) 🚧 2026-07-25

Full design review approved (three revisions — architecture, backend
orchestration + four-tier RBAC + comprehensive audit, then soft-delete
lifecycle + MFA-readiness). Building phase by phase, one commit per
phase, per the standing implementation-mode rules.

### Phase 1 — Permission-map scaffolding ✅

**What:** Four-tier role model (Super Admin / Admin / Manager / Employee)
and a capability-based authorization layer, additive only — no existing
endpoint's authorization changed.

- `UserRole` gains `MANAGER` and `ORG_ADMIN` (labelled "Manager" and
  "Admin" — `ADMIN` keeps meaning "Super Admin", unchanged) — migration
  `1783774200000-AddManagerAndOrgAdminRoles` (additive `ALTER TYPE ...
  ADD VALUE`, irreversible-in-practice like other enum-widening
  migrations in this history)
- `Permission` enum + `ROLE_PERMISSIONS` map — `apps/backend/src/auth/permissions.ts`,
  the single source of truth for what each tier can do; extending or
  rebalancing access later is a map edit, not a new guard
- `PermissionsGuard` + `@RequirePermissions` + `@AuthPermission(...)` —
  a parallel authorization path alongside the existing `@Auth(...roles)`,
  which is untouched; new staff-management endpoints will use the
  permission-based path going forward
- `packages/shared-types`' `UserRole` and admin-panel's `ROLE_LABELS`
  widened to match, so the workspace stays green — no new UI yet

**Verification:** backend typecheck/lint/tests all pass (44/44,
including 4 new permission-map tests); `shared-types` rebuilds clean;
admin-panel typecheck/lint clean. Migration written, not yet run
against the local dev DB.

**Cross-check performed:** `@Auth(...)` and every existing call site
using it are byte-for-byte unchanged — this phase adds a parallel
mechanism, it doesn't touch the one Module 1 (or the Customer App's
session sync) already depends on.

### Phase 2 — Backend-orchestrated Firebase provisioning + invite dispatch ✅ 2026-07-26

**What:** `UsersService.createStaffUser` now creates the real Firebase
Authentication user itself (via a new `FirebaseAdminService`, Admin
SDK `createUser` + `generatePasswordResetLink`) instead of writing a
`pending-staff:` sentinel UID for `AuthService` to lazily link on
first sign-in. The new `users` row gets its real `firebaseUid`
immediately — provisioning and linking are now the same step, not two.

- `FirebaseAdminService` (`src/firebase/`) — `provisionStaffAccount`
  creates the user with no password field at all (the backend never
  generates, sees, or stores one) and generates its invite/
  password-setup link; `deleteUser` is the rollback primitive. If link
  generation fails after the Firebase user was created, it deletes
  that user before rethrowing. Exported from the existing `@Global()`
  `FirebaseAdminModule`.
- `UsersService.createStaffUser` orchestrates: dup-email check → create
  Firebase user → create the DB row (+ employee profile) → audit log.
  If the DB step fails after Firebase succeeded, the Firebase user is
  rolled back (best effort) so a failed attempt never leaves an
  orphaned Firebase identity with no `users` row. Writes an
  `audit_logs` row (`staff_invited`) per the same pattern
  `CustomersService` already uses — metadata is `{ email, role,
  firebaseUid }`, never the invite link.
- The invite link is returned only in `POST /v1/users`'s response
  (`CreateStaffUserResponseDto.inviteLink`) — **never persisted**. It
  can't be re-fetched later; the Admin Panel's Team screen shows it
  once, with a "Copy invite link" action, so the admin can send it via
  WhatsApp/email/SMS/whatever. Built this way deliberately so a real
  email provider (SMTP/SendGrid/SES) can be plugged in later as an
  alternative dispatch path without changing the provisioning
  workflow itself.
- `AuthService.syncExisting` now also stamps `activatedAt` on a
  provisioned (non-customer) row's first sign-in — needed because that
  first sign-in now hits the direct `findByFirebaseUid` match (real UID
  set at creation), not `activateStaffInvite`'s legacy sentinel-swap
  path, which remains untouched and still handles any pre-Phase-2 rows.
- `PENDING_STAFF_UID_PREFIX` and the sentinel/lazy-linking path are
  kept (not removed) — dead-but-safe for any rows already created by
  the pre-Phase-2 flow.

**Verification:** backend typecheck/lint/build/tests all pass (58/58,
+14 new: `FirebaseAdminService` unit tests, `UsersService` orchestration/
rollback/audit tests, `AuthService` activation-stamping tests);
`shared-types` and admin-panel typecheck/build clean. Verified live
end-to-end against the real `loan-manager-india` Firebase project:
booted the backend, minted a real ID token for an existing test admin,
called `POST /v1/users` — got a real Firebase-hosted invite link back
and a `users` row with a real (non-sentinel) `firebaseUid`; minted a
token for the new user's real UID to simulate its first sign-in against
a protected endpoint and confirmed `activatedAt` got stamped; confirmed
a duplicate email is rejected with 409 before Firebase is ever called.
Test account and Firebase user deleted afterward.

**Deliberately deferred:** real email/SMTP dispatch (explicit
instruction — link-only for now, architecture leaves room for it),
migrating `UsersController`'s `@Auth(ADMIN)` to the new
`@AuthPermission`/`STAFF_CREATE_*` split (out of this phase's scope).

### Phase 3 — Disable / Archive / Restore lifecycle ✅ 2026-07-26

**What:** the full Team Management lifecycle approved in the Phase 3
design review — an explicit `AccountStatus` (`ACTIVE`/`DISABLED`/
`ARCHIVED`) alongside the existing `isActive` boolean (kept in lockstep
by `UsersService`, so `SyncUserGuard`'s enforcement is unchanged), plus
login metadata and Team-screen status badges.

- `AccountStatus` enum (`src/database/entities/enums.ts`) +
  `AddAccountStatusAndLoginMetadata` migration — `users` gains
  `status`, `status_reason`, `status_changed_at`,
  `status_changed_by_id` (mirrors the existing `kyc_reviewed_*`
  pattern), and `last_login_at`/`last_failed_login_at`/
  `last_login_ip`/`last_device`. Existing rows backfilled from
  `is_active`.
- `UsersService.disableStaffUser` / `archiveStaffUser` /
  `restoreStaffUser` (`PATCH /v1/users/:id/disable|archive|restore`,
  gated by the new `@AuthPermission(STAFF_DISABLE|STAFF_ARCHIVE|
  STAFF_RESTORE)` — the first real usage of Phase 1's permission path).
  Disable/Archive require a mandatory reason; both block a self-action
  and block leaving zero active Super Admins
  (`UserRepository.countActiveByRole`); Archive additionally blocks an
  `EMPLOYEE` with active leads still assigned
  (`LoanApplicationRepository.findActiveAssignedTo` — reuses Lead
  Assignment's existing query, no new reassignment machinery). Every
  transition writes one immutable `audit_logs` row
  (`staff_disabled`/`staff_archived`/`staff_restored`).
- Session revocation consolidated: `FirebaseAdminService.revokeSessions`
  is now the one place that calls `revokeRefreshTokens` — Disable/
  Archive use it for every staff role, and `WorkStatusService`
  (Employee-only Force Logout/Disable, predates this phase) was
  refactored to delegate to it instead of duplicating the logic
  locally.
- `AuthController.createSession` (`POST /v1/auth/session`) now stamps
  `lastLoginAt`/`lastLoginIp`/`lastDevice` — the one endpoint that
  represents an actual fresh login, as opposed to `SyncUserGuard`'s
  per-request `lastActiveAt` presence stamp. `SyncUserGuard` stamps
  `lastFailedLoginAt` when a still-valid Firebase token belongs to a
  disabled/archived account — the one failed-login case attributable
  to a specific user (a bad password never reaches this backend at
  all; Firebase owns that failure).
- `PermissionsGuard` — added to `AuthModule`'s providers/exports. It
  existed since Phase 1 but had never actually been wired into any
  module's DI, since no endpoint used `@AuthPermission` yet; this
  phase's endpoints are the first real usage, so this was fixed as
  part of making them work, not a separate change.
- Admin Panel: `StaffListPage` now shows Active/Invited/Disabled/
  Archived badges (with the current `statusReason` under
  Disabled/Archived) and a Last sign-in column; per-row
  Disable/Archive/Restore actions (hidden for the signed-in admin's own
  row) open a new shared `StaffLifecycleModal` — reason required for
  Disable/Archive, plain confirmation for Restore.

**Verification:** backend typecheck/lint/build/tests all pass (77/77,
+19 new: lifecycle guard tests covering every approved rule, plus
`FirebaseAdminService.revokeSessions` tests); `shared-types` and
admin-panel typecheck/lint/build clean. Migration run against the local
dev DB. Verified live end-to-end against the real backend + Firebase
project: created a real test employee, disabled it (reason required,
session-revocation call fired, audit row written), confirmed the
already-disabled/already-active conflicts, confirmed self-disable and
self-archive are rejected with 400, confirmed archiving is blocked
while a real active lead is assigned and succeeds once it isn't,
restored it back to Active, confirmed `POST /v1/auth/session` stamps
real login metadata (IP/User-Agent), and confirmed a disabled/archived
account's fresh (unrevoked) token still gets a 401 with
`lastFailedLoginAt` stamped. Test employee, its Firebase user, and the
test lead were all deleted afterward.

**Deliberately out of scope this phase (per explicit instruction):**
maker-checker/dual-approval workflows for any transition — noted as
possible future enterprise work, not forgotten.

### Phase 4 — Team Management enhancements: search/filter/sort, Password Reset/Resend Invite, UX polish ✅ 2026-07-26

**What:** everything needed to make the Team screen usable as a real
directory rather than a flat list, plus the last unimplemented
Phase-1-reserved permission (`STAFF_RESET_PASSWORD`).

- `GET /v1/users` gains optional `search`/`role`/`status`/`sortBy`/
  `sortDir` — all additive, defaulting to the exact pre-Phase-4 behavior
  (no filter, newest-first) when omitted.
  `UserRepository.findStaffPaginated` rewritten with a query builder;
  `sortBy` is validated against a whitelist (`STAFF_SORT_FIELDS`) both
  at the DTO layer and again inside the repository, since a sort column
  is interpolated into `ORDER BY` and can't be parameterized like a
  value. Base role scope (EMPLOYEE/ADMIN only) is unchanged — the
  `role` filter narrows within it, never expands it.
- **Password Reset / Resend Invite** — one backend method
  (`UsersService.resendInviteOrResetPassword`,
  `POST /v1/users/:id/reset-password`, gated by the Phase-1-reserved
  `STAFF_RESET_PASSWORD` permission) covers both: same underlying
  Firebase operation (`FirebaseAdminService.generatePasswordSetupLink`,
  factored out of `provisionStaffAccount`), distinguished only by audit
  action name (`staff_invite_resent` vs. `staff_password_reset`,
  chosen from `activatedAt`) and the Admin Panel's label. Blocked for a
  non-ACTIVE account (409) — a new link would be useless since sign-in
  is blocked regardless.
- **Real bug found and fixed during live verification:** a dev-fixture
  row with a placeholder (non-real) `firebaseUid` made
  `generatePasswordResetLink` throw a raw, unhandled Firebase error,
  surfacing as a generic 500. `FirebaseAdminService.generatePasswordSetupLink`
  now recognizes this specific failure mode
  (`auth/user-not-found`, or the Admin SDK's `auth/internal-error`
  "Unable to create the email action link") and translates it into a
  clear `ConflictException` — any other error is rethrown unchanged so
  a genuinely transient Firebase problem isn't mischaracterized.
- Admin Panel `StaffListPage`: search box (debounced), role/status
  filter dropdowns, sortable column headers, Previous/Next pagination,
  a `createdAt`-derived "Added" column, and Resend Invite/Reset
  Password actions (label chosen from `activatedAt`, hidden for
  disabled/archived rows to match the backend gate). `StaffLifecycleModal`
  extended with a `reset-password` action (confirm → shows the fresh
  one-time link, same "Copy link" pattern as account creation). New
  `SuccessBanner` (`components/states/`, peer to Loading/Empty/Error)
  shows a contextual message after every lifecycle action or account
  creation.

**Verification:** backend typecheck/lint/build/tests all pass (90/90,
+13 new: search/filter/sort passthrough, resend-invite/reset-password
guard tests, and the new Firebase error-translation tests including
the exact failure mode found live); `shared-types` and admin-panel
typecheck/lint/build clean. No migration needed (no schema change).
Verified live end-to-end against the real backend + Firebase project
and the real Admin Panel UI: default list behavior unchanged; `search`,
`role`, and `status` filters each verified independently against real
rows; pagination meta verified with a small page size; Resend Invite
verified for a never-signed-in account (audit: `staff_invite_resent`),
then Password Reset verified after simulating activation (audit:
`staff_password_reset`); reset-password confirmed blocked (409) for a
disabled account; the 500→409 fix verified both via direct API call
and by reproducing it in the actual browser UI (the error now renders
as a clear message inside the modal instead of "Internal server
error"); full UI walkthrough — search narrowing the table live, the
success banner rendering after both account creation and Resend
Invite, and the "Working…"/result-link states in the lifecycle modal.
Test employees and their Firebase users deleted afterward.

**Deliberately out of scope this phase:** Phase 5 (not started, per
instruction).

### Phase 5 — Maker-checker (dual-approval) for staff lifecycle ✅ 2026-07-27

**What:** the maker-checker workflow explicitly deferred at Phase 3.
Scope locked by the user during design review: only Disable/Archive/
Restore are gated (Create/Resend-Invite/Reset-Password stay immediate);
only `ORG_ADMIN`-initiated actions require a second approver — `ADMIN`
(Super Admin) actions stay immediate, exactly as before. Built to be
extensible: a data-driven policy lookup decides who's gated (not a
hardcoded role check), and an executor registry decides what runs on
approval (not a growing if/else) — so a future high-risk action (Role
Change, Delete User, Permission Change) or extending the policy to
`ADMIN` itself is a data change, not an architecture change.

- New `approval_requests` table (`ApprovalRequestEntity`, migration
  `AddApprovalRequests`) — action-agnostic (`action` is free-text
  varchar, same convention as `AuditLogEntity.action`, not a Postgres
  enum), with a `pending/approved/rejected/withdrawn/failed` status
  enum. A partial unique index (`target_user_id, action WHERE status =
  'pending'`) backstops "at most one pending request per (target,
  action)" at the DB level.
- New sibling `ApprovalsModule` (not folded into `UsersModule`, which
  already covers a lot) — `MakerCheckerPolicyService.requiresApproval(role,
  action)` (static map, currently `ORG_ADMIN` × the three staff actions
  → `true`, default `false`), `ApprovalActionExecutorRegistry`
  (`action string → executor`, so `ApprovalsService.decide` never
  branches on action name), `ApprovalsService` (create/decide/withdraw
  + the notification/audit plumbing), `ApprovalsController`
  (`GET /v1/approvals`, `GET /v1/approvals/mine`,
  `POST /v1/approvals/:id/decision`, `PATCH /v1/approvals/:id/withdraw`),
  gated by two new permissions (`APPROVAL_READ`/`APPROVAL_DECIDE`,
  `ADMIN`-only via `ALL_PERMISSIONS`).
- `UsersService.disableStaffUser`/`archiveStaffUser`/`restoreStaffUser`
  refactored into `preflight*`/`execute*` pairs: the guard checks run
  once up front (fail-fast — a doomed request, e.g. self-action or last
  active Super Admin, is never created), then either
  `approvalsService.createRequest(...)` (returns `{ outcome:
  'pending_approval', request }`) or the now-public `execute*` (returns
  `{ outcome: 'executed', user }`) depending on the policy. `execute*`
  is what the executor registry calls on approval too — re-running the
  full preflight from scratch every time is what makes staleness
  handling (state drifted between request and decision) automatic
  instead of a separate code path; a drifted precondition surfaces as a
  normal exception, caught and recorded as `status: 'failed'` with
  `failureReason`, never left silently `pending`.
- Self-approval is guarded in `ApprovalsService.decide` even though
  it's unreachable under today's policy (only `ADMIN` can currently
  hold `APPROVAL_DECIDE`, and `ADMIN` can't currently be a maker) —
  written and tested now as the safety net for the day the policy is
  extended to gate `ADMIN` too.
- **Real gap found and fixed as part of this phase:** `ORG_ADMIN` had
  zero UI access to the Team page at all — `navigation.config.ts` and
  `router.tsx` both gated it to `roles: ['admin']` only, despite
  `ORG_ADMIN` holding `STAFF_DISABLE`/`STAFF_ARCHIVE`/`STAFF_RESTORE`
  permission since Phase 3. Fixed by adding `'org_admin'` to both.
- Admin Panel: new `Settings → Approvals` page (`ADMIN`-only nav item +
  route) — the checker's queue, with an Approve/Reject decision modal
  (`decisionNote` required to reject, optional to approve, mirroring
  `StaffLifecycleModal`'s structure). `StaffLifecycleModal` branches on
  the new `StaffLifecycleOutcome` union: an `ORG_ADMIN`'s submit shows
  "submitted for Super Admin approval" instead of assuming the account
  changed. `StaffListPage` shows a "Pending X approval" badge and
  disables the lifecycle buttons for a row with an open request
  (server already blocks the duplicate; this just preempts a
  guaranteed-to-fail click).

**Verification:** backend typecheck/lint/tests all pass (117/117, +33
new: `MakerCheckerPolicyService`, `ApprovalActionExecutorRegistry`,
`ApprovalsService` — including duplicate-request blocking,
self-approval, stale-precondition-at-approval-time, and reject-never-
executes — plus the updated `UsersService` maker-checker-fork suite);
migration verified with a real `migration:run` → `migration:revert` →
`migration:run` cycle against the dev database, confirming `down` is
symmetric. `shared-types`, and admin-panel typecheck/lint/build all
clean. Live end-to-end verification (an `ORG_ADMIN` submitting a
request, a Super Admin approving/rejecting from the real UI, and the
notification/audit trail) is the user's own next manual pass, per the
established workflow for this module — not yet run in this session.

---

## Module 3 — Case Number (permanent Business ID) ✅ 2026-07-27

**What:** every Loan Application now gets a permanent `LM-{year}-{6-digit}`
identifier — the primary business identifier staff use to reference a
case, distinct from the internal UUID. Locked as an architectural
requirement before further CRM modules are built, so future screens
(Customer 360, Reports, Analytics, the Document Center) get it for free
from the API response rather than needing a retrofit. Confirmed as part
of this work: the backend was already case-centric (a customer can
already have multiple independent `LoanApplicationEntity` rows — no
domain-model redesign was needed, this was purely additive).

- New `case_number_counters` table (one row per calendar year) —
  incremented via a single atomic `INSERT ... ON CONFLICT ... DO UPDATE
  ... RETURNING` statement (`CaseNumberService.generate`,
  `apps/backend/src/loan-applications/case-number.service.ts`). This is
  a deliberately stronger mechanism than the existing
  `LoanRepository.generateLoanNumber()` (random + DB-constraint-as-
  safety-net, which tolerates collisions) — Case Number's "generated
  atomically"/"never reused" requirements aren't met by that pattern,
  so a different one was built rather than reusing it; `loanNumber`
  itself is untouched (different identifier, unrelated scope).
- `LoanApplicationsService.submit()` now runs inside its own
  `dataSource.transaction` — the counter increment and the application
  insert commit or roll back together, so a failed submission never
  "burns" a case number against a row that doesn't exist. Migration
  `1783774500000-AddCaseNumberCounters` + `1783774600000-AddCaseNumberToLoanApplications`
  (the latter also backfills every pre-existing application, sequentially
  per year in `submitted_at` order, and seeds the counter table from the
  backfilled counts).
- Surfaced on `LoanApplicationResponseDto` (the one response DTO both
  `LoanApplicationsController` and `LeadAssignmentController` already
  share) and in the three existing customer notification bodies
  (approve/query/reject/disburse). Admin Panel: new "Case Number" column
  + search term on both `LeadsPage` and `MyLeadsPage`, shown first in
  `LeadDetailPage`'s header.

**Verification:** backend typecheck/lint/tests all pass (122/122, +5
new `CaseNumberService` tests, plus the updated `submit()` gate tests in
`loan-applications.service.spec.ts`); both migrations verified live
against the dev database — 15 pre-existing applications backfilled
correctly to `LM-2026-000001` through `LM-2026-000015` in submission
order, `case_number_counters` seeded to `{ year: 2026, last_value: 15 }`
(confirmed by direct query) — then a full `migration:run` → `revert` →
`revert` → `run` cycle to confirm both `down`s are symmetric.
`shared-types` and admin-panel typecheck/lint/build all clean. Live
end-to-end verification (submitting a new application and confirming it
continues the sequence at `LM-2026-000016`) is the user's own next
manual pass.

**Deliberately out of scope this module:** every other requested
surface (Customer 360, Documents, Timeline, Bank Submission, Reports,
Analytics, Print, Export) — those screens don't exist yet per the
roadmap below; they inherit `caseNumber` automatically once built, no
further backend work needed. Also out of scope: aligning `loanNumber`
to the same atomic-counter pattern (flagged as a low-priority future
follow-up, not done here).

---

## Module 4 — Document Versioning (immutable upload history) ✅ 2026-07-27

**What:** backend data-model only, no UI this phase (explicitly deferred by
the user). Every uploaded document now becomes an immutable
`DocumentVersionEntity` row; `DocumentEntity.currentVersionId` points at
whichever is latest. Fixes a real, previously-undocumented gap: replacing
a document in an occupied slot used to delete the old storage file and
overwrite its row in place, permanently destroying history — this made
every planned future feature (Version History, Rollback, per-version
Verification History, AI/OCR reprocessing, Re-upload comparison, bank
compliance review) impossible to build later without a break in the data.

- `DocumentEntity` keeps its exact existing shape (a live mirror of the
  current version) so every existing reader — the loan-approval gate
  (`getBlockingDocumentsForApproval`), `buildOverview`, the streaming/
  download endpoints, and the already-built Document Management Center
  UI (`DocumentManagementCenter.tsx`/`VerificationModal.tsx`) — needed
  **zero changes**. Only the three write paths changed: `upload()`'s
  replace branch (stopped deleting the old file; now creates a new
  version and marks the previous one `supersededAt`), `upload()`'s
  brand-new-slot branch (now transactional, creates version 1),
  and `updateVerification()` (now updates both the document row and its
  current version).
- `delete()` is unchanged in intent (a customer explicitly removing a
  document type from their application, a different action from
  replace/re-upload) but now cleans up every version's storage file, not
  just the current one.
- New minimal read endpoint, `GET /v1/documents/staff/:id/versions`
  (staff-only, same access pattern as the existing audit endpoint) —
  proves the data model works end-to-end without building any Version
  History/Rollback/Comparison UI.
- Existing rows backfilled as version 1 of themselves in the same
  migration set.

**Verification:** backend typecheck/lint/tests all pass (128/128, +6 new
Document Versioning scenarios: replace never deletes the old file,
replace creates a new version and marks the old one superseded, a
brand-new upload creates exactly one version, `updateVerification`
updates both rows, `delete` removes every version's file); migration
verified live against the dev database — 42/42 pre-existing documents
backfilled with a matching version-1 row and identical file data,
`current_version_id` set on all of them — then a full `migration:run` →
`revert` → `run` cycle to confirm `down` is symmetric. `shared-types` and
admin-panel typecheck/lint/build all clean (zero UI behavior change, as
intended — `DocumentMetadata.currentVersionId` is inert until a future
Version History UI reads it).

**Deliberately out of scope this module:** the Version History/Rollback/
Comparison/OCR-reprocessing UI itself — data-model support only, per
explicit instruction.

---

## Module 5 — Design System Foundation, Phase 1 (App Shell) ✅ 2026-07-27

**What:** presentation-layer-only pass (backend/API/business logic
frozen for this initiative) toward a premium fintech CRM look, using a
user-supplied dashboard reference image as the primary visual target.
Phase 1 of 4 (Migration order: tokens/shell → Dashboard → forms/dialogs
→ remaining screens) — this is the shell + primitives pass only.

- **Tokens** (`theme/tokens.css`, additive, existing values untouched):
  `--color-accent-electric` (a new token deliberately *derived from* the
  existing frozen indigo `--color-primary` family, not a foreign hue —
  confirmed with the user specifically so Customer App + Admin Panel
  stay visually unified; reserved for interaction states only — active
  nav, links, interactive icons, chart highlights, focus rings, selected
  states, primary hover — never a fill/background), glassmorphism
  tokens (`--glass-bg/border/blur/shadow`), motion tokens
  (`--motion-duration-*`/`--motion-ease-*`, mirrored into a new
  `theme/motion.ts` for Framer Motion). Dark-mode token coverage
  completed (previously-missing status-color/accent-gold/secondary dark
  variants filled in) and a `[data-theme="dark"]` attribute-selector
  layer added alongside the existing OS-preference media query — **no
  toggle ships**; the Topbar's moon icon is a static visual element,
  per explicit "No dark theme" instruction. The architecture is ready
  for a future toggle with zero component changes.
- `framer-motion` added (previously no animation library existed —
  confirmed via audit, only a handful of 150–200ms CSS hover
  transitions and one spinner `@keyframes`). Wired into `Modal` (entrance
  only — most call sites don't wrap it in `AnimatePresence`, so exit
  wouldn't play anyway), the new `DropdownMenu` (full enter/exit),
  `Alert`, and `AppLayout` (mobile scrim, `ForceResumeBanner`, and
  route-level page transitions via `AnimatePresence mode="wait"` keyed
  on pathname).
- **App Shell restyle**: `Sidebar` (deep-indigo/purple gradient per the
  reference, active-item pill highlight, live count badges on
  Leads/Approvals — sourced from `fetchUnassignedLeads`/
  `fetchPendingApprovals`, already-existing endpoints, via a new
  `useNavCounts` hook, no backend change), `Topbar` (styled global
  search input, a real notification-bell unread-count badge sourced
  from `fetchMyNotifications`, static dark-mode icon), `Breadcrumbs`
  (restyle only).
- **New shared primitives**: `DropdownMenu` (generic, extracted from
  `UserMenu`'s hand-rolled implementation — `UserMenu` is now a
  consumer of it) and `Alert` (variant info/success/warning/error —
  `SuccessBanner` is now a thin wrapper around it, same external API,
  zero call-site changes needed). `Icon.tsx`'s hand-rolled set expanded
  (document, hourglass, money, people, calendar, upload, plus,
  moreVertical, filter, sun, moon, infoCircle, settings, barChart) —
  same no-icon-library-dependency convention the file already
  documented.
- **Full mockup nav list ships now** (Dashboard, Leads, Applications,
  Documents, Approvals, Tasks, Customers, Employees [renamed from
  "Team" — same route/screen, label only], Employee Status, Reports,
  Settings) for visual completeness, but **items with no real screen
  yet route to an honest `ComingSoonPage`**, not fake data — flagged via
  a new `comingSoon` field on `NavItem`. `Tasks` is flagged separately
  in code comments: unlike the others, there's no Task concept
  anywhere in the backend at all.
- The reference image's global search ("Search by Case Number, Customer
  Name, Phone, Email…") is **not wired to a live search** — no
  cross-entity backend search endpoint exists, and adding one is
  backend work, out of scope for this presentation-only pass. The input
  is real/focusable/styled; it just doesn't search anything yet.

**Verification:** admin-panel typecheck/lint/build all clean throughout
(checked after each component group, not just at the end). Every
existing feature screen's data logic is untouched — only the shell
around them changed, so Team/Leads/Approvals/Documents-verification
flows keep working exactly as before. Dev server boots and serves the
app shell correctly (confirmed via direct HTTP check). **Live visual
comparison against the reference image was not completed this
session** — the browser automation tool wasn't connected — the dev
server was left running at `localhost:5173` for the user's own visual
check; flagged explicitly rather than claiming a visual match that
wasn't actually verified.

**Deliberately out of scope this phase** (per the approved Phase 1
file list): `GlassCard`, `StatCard`, `Badge`/`StatusPill`,
`Select`/`Checkbox`/`Radio`, `Tabs`, `Drawer`, `SearchInput` (as a
reusable component — Topbar's search is inline for now),
`Pagination`, `Avatar`, `Skeleton`, `LineChart`, `DonutChart`,
`DataTable` — all Phase 2+ per the migration order. Also deferred:
wiring the still-orphaned `DocumentManagementCenter` into nav/routes
(Phase 4), and `DatePicker`/`Accordion`/`ActivityFeed` (no current
consumer — build on demand, not speculatively).

---

## Module 5 — Design System Foundation, Phase 2 (Dashboard rebuild) ✅ 2026-07-27

**What:** rebuilt `AdminDashboardPage` against the reference mockup,
bound entirely to real backend data — no placeholder charts, no
fabricated numbers. New primitives: `StatCard` (icon badge, value,
optional real `trend` or a neutral `footerNote`, plus a `loading`
skeleton state), `DataTable` (generic, sortable, optional pagination,
`Skeleton` rows while `data === null`), `Skeleton`, hand-rolled SVG
`LineChart` (Catmull-Rom-smoothed, multi-series, animated stroke
reveal) and `DonutChart` (`stroke-dasharray` arcs, animated fade/scale
mount) under `components/charts/`. New `features/dashboard/dashboard-data.ts`
holds all the client-side aggregation math (monthly bucketing,
status-distribution counts, disbursed-amount sum, month-over-month
deltas) — same precedent `activity.ts` already set for Recent Activity.

**Data sourcing:** all four widgets group their own load/error state
independently (`leads`, `employees`, `customers`, `approvals`) so one
endpoint failing doesn't blank the whole page. `GET /v1/customers` got
its first frontend wrapper (`features/customers/customers-api.ts` +
`CustomerSummary` in shared-types) — needed for the Active Customers
stat, previously unused by the admin panel.

**Honesty constraints kept deliberately:** Pending Approvals and Active
Customers show a neutral `footerNote` instead of a trend — no real
timestamp history exists for either (no `createdAt` on customers, no
approval-queue snapshot history), so a "vs last month %" would be
fabricated. Total Applications and Disbursed Amount do show a real
trend, computed from actual `submittedAt`/`disbursedAt` timestamps. The
status donut uses the real six `LoanApplicationStatus` values plus the
already-established `getDisplayStatus()` split of `approved` into
"Awaiting Disbursement"/"Disbursed" — not an invented bucket set. Quick
Actions were adapted from the mockup's customer-facing actions to real
admin shortcuts (Assign Leads / Review Approvals / Manage Employees /
Notifications). Employee Workload Summary and Recent Activity — not in
the mockup — were kept and restyled rather than dropped.

**Verified:** typecheck/lint/build clean; live-checked against a real
seeded account — Total Applications (15) matches the Recent
Applications table and the donut's total; the donut's per-status counts
sum to the same 15; Pending Approvals (0) matches the sidebar Approvals
badge; Employee Workload Summary and Recent Activity render unchanged.

---

## Up next

Per the approved blueprint's build order, and the confirmed post-Phase-5
roadmap: Design System Foundation Phase 3 (forms/dialogs polish), then
Phase 4 (remaining screens + wiring `DocumentManagementCenter`), then
ZIP export + Case Summary PDF, then the remaining queued modules —
Customer 360 (retires the KYC review screens currently orphaned in the
frozen legacy Flutter Employee App), the Lead Pipeline/Documents visual
pass, Banks &amp; Partners, Analytics, and Audit Log.
