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

## Module 6 — Enterprise CRM Modules, Phase 3 (Applications) ✅ 2026-07-27

**What:** replaced the `/applications` placeholder with a production
Applications module — the master case list across every status (unlike
`LeadsPage`'s unassigned/assigned assignment-queue tabs). Search,
status/category/assignment/date filters, sortable+paginated `DataTable`,
localStorage-backed Saved Views (`features/applications/saved-views.ts`
— deliberately client-only, not a new backend domain), bulk reassign
(reuses `transferSelectedLeads`), and a real client-generated CSV
export. Every row opens the **existing** `LeadDetailPage` at
`/applications/:id` — no second detail page was built. That page's
back-button target, previously hardcoded to the caller's role, now
reads an optional `location.state.from` so it returns to whichever list
linked in (`/leads`, `/my-leads`, or `/applications`).

**Audit Trail (new):** `GET /v1/loan-applications/:id/audit-trail`
merges two already-real, already-populated sources into one
chronological log — `AuditLogEntity` decision rows (review/disburse,
already written by `LoanApplicationsService`, previously just never
surfaced) and `LeadAssignmentEntity` ownership-change rows (already
written by `LeadAssignmentService`). No new write path was needed for
either; this endpoint is read-only. Rendered as a new "Audit trail"
section on the detail page, distinct from the existing human-readable
Timeline — same activity-feed-vs-raw-log split real enterprise CRMs
make.

**Dashboard wiring:** `StatCard` gained an optional `onClick` (with
proper keyboard/`role="button"` a11y) — a standing capability every
future KPI card will use, not a one-off. Total Applications → 
`/applications`; Pending Approvals → `/settings/approvals`; Recent
Applications rows → `/applications/:id`. Disbursed Amount and Active
Customers stay non-interactive until Reports (Phase 7) and Customer 360
(Phase 4) exist — no link to a page that isn't real yet.

**Verified:** backend — 131/131 tests pass (3 new `getAuditTrail`
tests: merge+sort correctness including the loan-vs-application
`entityName` split for disbursement rows, NotFound, and employee
ownership enforcement). Frontend — typecheck/lint/build clean.
Live-checked against the real seeded account: Applications list shows
all 15 real applications with working filters; a detail page opened
from it shows "Back to Applications" (proving the `from`-state fix);
its new Audit Trail section shows real merged entries ("Application
approved · By Test Employee", "Transferred · By System Administrator")
distinct from, and consistent with, the existing Timeline.

---

## Module 7 — Enterprise CRM Modules, Phase 4 (Customer 360) ✅ 2026-07-27

**What:** Customer 360 (`/customers/:id`) — one screen with everything
about a customer: profile header (avatar/initials — reuses `UserEntity.
photoUrl`, real, not invented — with contact/PAN/masked-Aadhaar/address/
KYC status), 8 summary `StatCard`s (Active/Approved/Rejected/Pending
applications, Uploaded/Missing documents, Last Activity, Assigned
Officer), a unified Timeline, the customer-scoped Audit Trail, an
Application History `DataTable`, the embedded `DocumentManagementCenter`
(unchanged, already customer-scoped), and read-only Internal Notes
(reusing each application's existing `internalNotes` field — no
customer-level notes field was invented). Communication history was
explicitly **omitted** — no messaging/call-log backend exists, per the
"don't fabricate" rule.

**Backend — one round-trip aggregate**, `CustomerOverviewService`
(`GET /v1/customers/:id/overview`): reuses `LoanApplicationResponseDto`
and `CustomerProfileResponseDto` as-is for applications/profile — no
parallel response shapes invented, since `LeadSummary` on the frontend
is already the identical wire shape. Only genuinely new: a small
`CustomerOverviewDocumentDto` for the flat cross-application document
list. Assembled via direct repository injection (`LoanApplicationRepository`,
`DocumentRepository` registered a second time in `CustomersModule`)
rather than depending on `LoanApplicationsService`/`DocumentsService`
directly — both of those modules already import `CustomersModule`
(`LoanJourneyDetectionService` needs `CustomersService`), so a service-
level dependency back would be a module cycle; the repositories are
stateless TypeORM wrappers, so a second registration is the same
trade-off Phase 3 already made for `AuditLogEntity`.

**Customer-scoped Audit Trail** (`GET /v1/customers/:id/audit-trail`):
generalizes Phase 3's per-application merge to every application this
customer has, plus the customer's own `AuditLogEntity` rows
(`CustomersService.reviewKyc`/`requestAccountDeletion` already wrote
these — again, no new write path).

**The mandatory "Download All Documents" feature**
(`GET /v1/customers/:id/documents/download-all`, new `archiver`+`pdfkit`
deps): streams `LM-<CASE_NUMBER>-Documents.zip` with zero server-side
buffering — every document piped straight from `StorageService.
getReadStream` into the archive, the archive piped straight into the
response. Folders use the **real** `DocumentCategory` catalog values
(Identity/Income/Employment/Balance Transfer/Loan Specific/Photo/Other)
— there is no "Address" category in the schema, so none was invented;
the brief's example folder list was adapted to what's actually real.
Includes a generated `Case_Summary.pdf` (case number, customer name,
every application number, loan amount, assigned employee, status,
full document inventory with upload dates/verification status).
Every download is audit-logged (`documents_zip_downloaded`, actor,
role, IP, case number). Live-verified: `GET .../download-all` → `200`,
17 real documents + the generated PDF, against the real seeded account.

**Staff document Delete** (new, admin-only — a more consequential action
than verification, held to a higher bar): `DELETE /v1/documents/staff/:id`
mirrors the existing customer-facing delete, wired into the shared
`DocumentManagementCenter` (so it's live everywhere that component is
embedded, not just Customer 360) behind a `ConfirmDialog`. "Replace" by
staff was **not** built — it would need a new staff-upload capability
that doesn't exist anywhere today, unlike Delete which directly reuses
an existing customer-facing method.

**Navigation wiring:** Applicant-name cells in `ApplicationsPage` and
the Dashboard's Recent Applications table now link to Customer 360
(row itself still opens Application Detail — the two targets coexist
via `stopPropagation`, matching the brief's "Case Number/customer
clicks → Customer 360" while preserving the already-shipped "row →
Application Detail" behavior). `LeadDetailPage` gained a "View Customer
360" link. `NotificationsPage`'s dead-link gap for Admin (a stale
comment from before Phase 3 built `/applications/:id`) is now fixed —
loan-application notifications deep-link for both Admin and Employee.

**Verified:** backend — 138/138 tests pass (7 new: `getAuditTrail`'s
customer-wide query scoping and merge/sort, `getOverview`'s NotFound
guard, `streamDownloadAll`'s access-control guards for
employee/admin/missing-customer — the ZIP/PDF streaming path itself
isn't unit-tested, `archiver`'s ESM build isn't Jest-parseable so it's
mocked out; covered instead by the live check above). Frontend —
typecheck/lint/build clean. Live-checked end-to-end against the real
seeded account: profile/KYC/PAN/Aadhaar/address all real; 8 summary
cards match the 7 real applications and 17 real documents; Timeline
merges 20+ real events (submissions, uploads, query raised/responded,
approval, transfers) newest-first; Audit Trail correctly includes a
customer-level `kyc_verified` entry alongside application-level events;
Application History table matches all 7 applications; Download All
Documents returned `200`.

---

## Module 8 — Enterprise CRM Modules, Phase 6 (Global Search) ✅ 2026-07-27

**What:** a real command-palette style Global Search — Ctrl+K/Cmd+K
(mounted once in `AppLayout` so it works from any page) or clicking the
Topbar's search field (converted from an inert text input into a
trigger button showing a live "Ctrl K" hint) opens `GlobalSearchDialog`:
a glass-blurred (`--glass-*` tokens), top-anchored overlay with a
debounced (250ms) input, results grouped exactly as specified
(Applications/Customers/Employees/Documents), full keyboard nav (↑/↓
across the flattened result list regardless of group, Enter opens,
Esc closes), Recent Searches (last 10, localStorage, clearable — same
client-only convention as Applications' Saved Views), and an honest
empty state ("No results found.", never an error for zero matches).

**Backend — one new aggregate endpoint** (judged "absolutely
necessary" per the brief's own conditional: PAN/Aadhaar/document
search cannot work client-side at all — that data was never loaded
into the frontend for any existing screen), `GET /v1/search?q=...`
(new `SearchModule`, `SearchService`, all-duplicated-repository
pattern — see below). Fans one query across four repositories in
parallel:
- **Applications**: Case Number only (Customer Name is the Customers
  group's job, not duplicated).
- **Customers**: name/email/phone match directly; PAN substring and
  Aadhaar match resolve separately via
  `CustomerProfileRepository.findUserIdsByPanOrAadhaar` (Aadhaar is
  never stored in full — only `aadhaarLast4` — so a query only matches
  it when it's exactly 4 digits; this *is* "masked search," not a
  limitation to fix later).
- **Employees**: an unrestricted staff-directory lookup (name/email/
  employee code) — available to Admin and Employee callers alike,
  unlike the other three groups.
- **Documents**: file name or catalog type label.

Employee callers are scoped to their own assigned customers for
Applications/Customers/Documents (mirrors the existing "Lead Locking"
model everywhere else in this app) via a new
`LoanApplicationRepository.findDistinctApplicantIdsAssignedTo`; Admin
is unrestricted. `SearchModule` duplicates `LoanApplicationRepository`/
`UserRepository`/`CustomerProfileRepository`/`DocumentRepository` as
lightweight providers rather than importing their owning modules —
same pattern Phase 3/4 already established, now used a third/fourth/
fifth time, including `UsersModule`'s own pre-existing use of it for
the same reason.

**Real bug found and fixed during live verification:** `.orderBy()`
combined with `leftJoinAndSelect` in TypeORM (this project's v0.3.30)
requires the **entity property name** (`application.submittedAt`), not
the raw snake_case column (`application.submitted_at`) — the latter
throws deep inside TypeORM's query builder
(`Cannot read properties of undefined (reading 'databaseName')`) even
though the exact same raw-column style works fine in plain `WHERE`
clauses (already proven elsewhere in this codebase, e.g.
`countAssignedToday`). Root-caused with a temporary standalone
diagnostic script run directly against the dev DB (deleted after use,
same throwaway-script precedent as the earlier Firebase credential
work) since the generic client-facing 500 body has no stack trace by
design. Fixed in both `LoanApplicationRepository.search` and
`DocumentRepository.search`, documented inline so it isn't
rediscovered the hard way in a future repository method.

**Deep-link decisions (routes not literally spelled out in the
brief):** a `document` result has no standalone preview route, so it
opens its owning customer's Customer 360 page instead (the document
already appears there, embedded); an `employee` result opens
`/settings/team` (the staff list — no individual employee-detail page
exists yet, "if available" honored honestly rather than linking
somewhere fake).

**Verified:** backend — 141/141 tests pass (3 new: query-length
short-circuit, employee scoping applied to Applications/Customers/
Documents but not Employees, admin never scoped). Frontend —
typecheck/lint/build clean. Live end-to-end in Chrome: Ctrl+K opens
from any page; typing "zainul" returned a real Customers result
(correctly highlighted/keyboard-navigable) that opened Customer 360 on
click; a case-number search ("LM-2026-000001") returned a correctly
status-colored ("Approved", green) Applications result; Recent
Searches persisted and displayed after reopening; Esc closed the
dialog cleanly.

---

## Module 9 — Enterprise Document Center (remaining Phase 5 scope) ✅ 2026-07-27

**What:** the platform-wide Document Center (`/documents`, previously a
placeholder) — every document across every customer, in one place.
List/Grid/Folder views, search, category/verification-status filters,
bulk actions (Mark Verified, Delete — Admin-only for delete), and every
per-document action already built for Customer 360
(Preview/Download/Verify/Request-Reupload/Delete/Audit), **plus one
genuinely new one**: Version History, wired to the
`GET /v1/documents/staff/:id/versions` endpoint that had existed since
the Document Versioning phase but never had a UI — now live via a new
`VersionHistoryModal`, reused as-is in both the Document Center and
retrofitted into Customer 360's `DocumentManagementCenter` (built once,
used in both places, per the explicit "do not duplicate" instruction).

**Backend — one new listing endpoint**, `GET /v1/documents/staff`
(`DocumentCenterService`, new — kept separate from the 700+-line
`DocumentsService` rather than growing it further, mirroring
`CustomerOverviewService`'s "one service per aggregate concern"
precedent). `DocumentRepository.findAllWithDetails` generalizes the
existing `findAllByOwnerWithDetails` to many/all owners with
category/status/search filters. Employee scoping reuses Global
Search's own `LoanApplicationRepository.findDistinctApplicantIdsAssignedTo`
via a new one-line delegate on `LoanApplicationsService`
(`getAssignedApplicantIds`) — the underlying query already existed,
this just exposes it to a second caller. New `DocumentCenterEntryDto`
adds `ownerId`/`ownerName` on top of the same field set Customer 360's
`CustomerOverviewDocumentDto` already established, since the Document
Center is the one place a document's owner needs to be shown at all.

**A real bug found and fixed during live verification:** the per-row
"more actions" `DropdownMenu` (Version History/Audit/Delete) opened
correctly in the DOM but was **visually clipped** — `DataTable`'s own
`overflow-x: auto` wrapper forces `overflow-y` away from `visible` per
the CSS spec, clipping any popover that opens inside one of its cells.
Fixed by switching the table's row actions to plain inline buttons
(matching `DocumentManagementCenter`'s own already-proven pattern
exactly, which never used a dropdown) — `DropdownMenu` stays safely in
the Grid view's cards, which aren't inside a scrolling table. Worth
remembering for any future "actions menu inside a `DataTable` cell."

**Verified:** backend — 143/143 tests pass (2 new: employee scoping
applied, admin unrestricted). Frontend — typecheck/lint/build clean.
Live end-to-end in Chrome against the real seeded account: all 42 real
documents render correctly in List (paginated, 3 pages), Grid, and
Folder (grouped by the 7 real `DocumentCategory` values, counts
matching) views; every row action opens correctly, including the new
Version History modal showing real version data; search ("Zainul")
correctly filtered to that customer's documents only.

---

## Module 10 — Reports & Analytics (Phase 7) ✅ 2026-07-27

**What:** `/reports` (previously a "Coming Soon" placeholder) — the five
real-data widgets confirmed with the user, no more and no fewer: Monthly
Applications (12-month trend), Approval Rate / Rejection Rate, Application
Status breakdown, Employee Performance, and Document Verification
Statistics (by status and by category). Branch Performance, Revenue, and
Customer Growth were deliberately left off rather than stubbed — no real
data exists for any of them (see [[project_enterprise_crm_modules]]'s
deferred list).

**Zero new backend endpoints.** A pre-implementation research pass (an
`Explore` subagent audit) confirmed all five widgets are computable
client-side from three already-existing endpoints — `fetchAllLeads()`,
`fetchEmployeesWithWorkload()`, and the Document Center's own
`fetchAllDocuments()` (built one phase earlier). New pure aggregation
functions in `features/reports/reports-data.ts`:
- `computeApprovalRejectionRates` — real counts over every loaded
  application, no invented sample.
- `computeEmployeePerformance` — joins the workload roster (source of
  truth for "who's an active employee") with each application's
  `assignedToId`, producing Assigned/Approved/Rejected/Disbursed +
  Approval Rate per employee. Employees with zero assigned leads still
  appear (rate shown as `—`, never a fabricated `0%` — no rate is a real
  rate when there's nothing to divide by, same "no trend without a
  baseline" discipline as `dashboard-data.ts`'s `computeMonthOverMonthDelta`).
- `computeDocumentStatusDistribution` / `computeDocumentCategoryBreakdown`
  — reuse the Document Center's own status/category label-color source,
  now extracted to `features/documents/document-status-meta.ts` (was
  previously inline consts in `DocumentCenterPage.tsx`) so both features
  share one definition instead of duplicating it — same "single source of
  truth" precedent as `workspace/lead-status-meta.ts` for applications.

Monthly Applications and Application Status **reuse `dashboard-data.ts`'s
`computeMonthlyTrends`/`computeStatusDistribution` directly**, unchanged
— exactly the "reusing dashboard-data.ts's aggregation approach"
instruction, not reimplemented for Reports.

**New UI pieces:** `ReportsPage.tsx` (StatCards for the two rates +
Documents Verified + Active Employees; `LineChart`/`DonutChart` reused
from the dashboard; a sortable `DataTable` for Employee Performance; a
plain category list for Documents by Category) and `reports-csv.ts` (a
generic CSV export helper, one export button per widget, same
escape/`triggerDownload` pattern as `applications-csv.ts`). Added a
`download` icon to the hand-rolled `Icon.tsx` set (none existed).

**Verified:** backend — 143/143 tests pass, unchanged (no backend files
touched). Frontend — typecheck/lint/build clean. Live in Chrome against
the real seeded account: Approval Rate 6.7% (1 of 15 real applications),
Rejection Rate 0.0%, Documents Verified 0 of 42, Application Status donut
(Submitted 80%/12, Under Review 13%/2, Awaiting Disbursement 7%/1 —
matches the 15-application total), Employee Performance table (Test
Employee: 3 assigned/1 approved/33.3%; Local Dev Employee: 0
assigned/`—`), Document Verification Status (42 Pending, 100%), and
Documents by Category (Identity 11, Income 10, Loan Specific 6, Photo 6,
Employment 4, Other 4, Balance Transfer 1 — sums to 42) all rendered
correctly on a fresh reload with zero console errors.

---

## Module 11 — Enterprise CRM Modules, Phase 8 (Settings) ✅ 2026-07-28

The final piece of the Phase 3-8 roadmap. `/settings` is now a real hub
(`SettingsHubPage.tsx`, links to Profile/Team/Approvals/Document Types)
replacing the Phase 1 "Coming Soon" placeholder.

**Document Types** (`/settings/document-types`, admin-only): full CRUD
UI (`DocumentTypesPage.tsx` + `DocumentTypeFormModal.tsx`) wired to the
already-built `DocumentTypesController` — list/create/edit/deactivate,
no delete endpoint by design (soft-disable via `isActive`, matching
`DocumentTypeEntity`'s doc comment).

**Profile** (`/settings/profile`, any authenticated staff role): a new
backend endpoint, `PATCH /v1/auth/me` (`UpdateProfileDto`,
`AuthService.updateProfile`), since only a read-only `GET /v1/auth/me`
existed before. Deliberately excludes Email/Role (Firebase-identity-tied
/ admin-controlled). `useAuth()` gained `refreshProfile()` so the
Topbar/Sidebar identity updates immediately after a self-edit. Added a
"My Profile" link to `UserMenu`'s dropdown, since employees have no
Settings sidebar entry — this also surfaced and fixed a `DropdownMenu`
bug (internal item clicks never closed the panel; fixed by closing on
any click inside it).

**Verified:** backend — 147/147 tests pass (4 new). Frontend —
typecheck/lint/build clean. Live in Chrome: created/edited/deactivated a
real document type, edited-and-reverted the real seeded admin's profile
name with the topbar updating live, confirmed the "My Profile" link and
dropdown auto-close.

---

## Module 12 — Design System Phase 3-4, Sub-phase 1 (Foundation: tokens, focus states, dedupe) ✅ 2026-07-28

First sub-phase of the post-Phase-8 enterprise UI polish initiative — a
full audit-driven pass making every screen read as one product, without
redesigning anything or touching business logic. A pre-implementation
audit (3 parallel `Explore` agents) surveyed the real codebase state;
every fix below is evidence-based, not speculative.

**Tokens** (`theme/tokens.css`): added `--focus-ring-color/width/offset`
(standardizes what `Button.module.css` already did ad hoc) and a
`--z-dropdown`/`--z-modal`/`--z-toast` scale (replaces hardcoded
`z-index: 100`/`90` in `Modal`/`DropdownMenu`). Additive,
admin-panel-only, same precedent as Phase 1's `--glass-*`/`--motion-*`
tokens.

**Focus-visible states** added (using the new token) to every
interactive shared element that was missing one: `Card`'s new opt-in
`.interactive` variant (consumed by `SettingsHubPage`'s link-cards, with
the actual focus ring correctly placed on the wrapping `<Link>`, not the
inert `<div>`), `Alert`'s dismiss button, `DataTable`'s sort button,
`Modal`'s close button, and the `.menuItem` pattern in both `UserMenu`
and `DocumentCenterPage`.

**Dedup:** `features/leads/ModalOverlay.tsx` — a fully hand-rolled Modal
clone (inline hex colors, `border-radius: 8` instead of the token, no
motion, no focus styling) — is deleted; its two consumers
(`EmployeePickerModal.tsx`, `AssignmentHistoryModal.tsx`) now use the
shared `Modal`/`Button`/`FormActions`/`EmptyState`/`ErrorState`/`LoadingState`.
The 5 files repeating `style={{ color: 'var(--color-error)' }}` for a
bottom-line submit error now render `<Alert variant="error" message={error} />`
instead — realizing the migration `Alert.tsx`'s own doc comment already
called out as "Phase 3/4" work. 4 hardcoded `#fff`/`#ffffff` occurrences
replaced with `var(--color-text-on-primary)`.

**Found, not yet fixed (queued for sub-phase 9 — Accessibility):**
`Modal.tsx` has no Escape-to-close handler, confirmed live (DropdownMenu
already has one).

**Verified:** frontend typecheck/lint/build clean (no backend touched).
Live in Chrome: focus ring confirmed via real keyboard Tab navigation on
the Settings hub card and the Document Types modal's close button; the
migrated `Alert`-based error confirmed by triggering a real backend 409
conflict (duplicate `pan_card` code); both migrated Lead Assignment
modals (`Assign`, `History`) confirmed rendering through the shared
`Modal` with zero console errors.

---

## Module 13 — Design System Phase 3-4, sub-phase 2 (Forms: validation UX, dirty-state, unsaved-changes) ✅ 2026-07-28

New shared primitive: `components/ui/useDirtyClose.ts` — wraps a
dirty-form modal's close path (backdrop/Cancel/X) so it asks for
confirmation via the existing `ConfirmDialog` instead of silently
discarding edits. Applied to the four highest-traffic modals that have
real user-entered state: `CreateStaffModal`, `DocumentTypeFormModal`,
`ApprovalDecisionModal`, `StaffLifecycleModal` — each computes its own
`isDirty` from its fields (for `DocumentTypeFormModal`, a `useRef`
snapshot of the initial values so edit-then-revert reads as "not
dirty" again).

**Inline field-level validation** (via `FormField`'s existing `error`
prop, previously unused) replaces the pre-emptive disabled-submit-button
pattern in `CreateStaffModal` (full name/email-format/employee-code),
`DocumentTypeFormModal` (label/code-format/max-uploads-range), and
`ProfilePage` (full name). Submit buttons are no longer disabled while
a field is invalid — clicking submits, `validate()` runs, and any
invalid field shows its own inline error without calling the API;
errors clear as the user edits that field. `ApprovalDecisionModal`/
`StaffLifecycleModal` keep their existing disabled-gate (their only
"invalid" state is an empty required reason with no format to
validate, so a second parallel error-display path would be pure
duplication).

**`ProfilePage`** additionally gained a `beforeunload` guard (warns on
tab close/refresh with unsaved edits) — verified by code review only
(the actual native browser prompt was deliberately not triggered live,
per the standing rule against triggering JS dialogs during browser
automation). In-app route-navigation blocking (`useBlocker`) is a
deliberate, noted non-goal for this pass — see the Design System Phase
3-4 memory.

**Verified:** frontend typecheck/lint/build clean (no backend
touched). Live in Chrome: confirm-on-close dialog triggered and both
its paths (Cancel → form stays open with data intact; Discard → form
closes) exercised on `CreateStaffModal`; empty-submit on
`CreateStaffModal` showed all three inline field errors simultaneously
without an API call; `ProfilePage`'s empty-name inline error shown,
then corrected and confirmed to clear automatically with the Save
button re-disabling once the value matched the original (not dirty);
zero console errors throughout.

---

## Module 14 — Design System Phase 3-4, sub-phase 3 (Tables: pagination + shared polish) ✅ 2026-07-28

**Pagination added** to the three tables the audit found rendering a
full unpaginated list: `LeadsPage` (both Unassigned/Assigned tabs — a
20-per-page slice of `filtered`, resets to page 1 on tab/search/filter
change, Previous/Next controls matching `StaffListPage`'s existing
pattern), `EmployeeStatusPage` (new `EmployeeStatusPage.module.css` —
this page had no CSS module before; page is clamped rather than
force-reset on each 15s live-poll, so an admin mid-review on page 2
isn't yanked back to page 1 every refresh), and `DocumentCenterPage`'s
Folders view (`pageSize={20}` — the List/Grid views already had this,
just a missing prop on the per-category `DataTable` call).

**`TableContainer.module.css` harmonized with `DataTable.module.css`**
(CSS-only, zero markup changes across its 5 consuming pages): sticky
header (`position: sticky`, matching `DataTable`'s existing pattern,
kept for consistency even though neither component's header visibly
sticks without a bounded-height scroll
container), header font-weight 700 (was 600) and padding tightened to
match, and the previously-transition-less unconditional row hover now
animates via the same `background-color` transition `DataTable`
already had — kept the hover itself (rather than making it
click-only like `DataTable`'s `.rowClickable`) since none of
`TableContainer`'s 5 consumers have row-level `onClick` today and
removing the affordance would be a behavior change beyond "harmonize."

**Verified:** frontend typecheck/lint/build clean (no backend
touched). Live in Chrome: `LeadsPage` renders correctly (12 real
unassigned leads, below the 20-per-page threshold so the pagination
bar correctly stays hidden — the conditional-render gate itself
confirmed working), `DocumentCenterPage`'s Folders view renders with
the new `pageSize` prop with zero regressions across its Balance
Transfer/Employment categories, `EmployeeStatusPage` renders with the
new sticky/bold header styling, zero console errors on all three.
Pagination *controls themselves* weren't exercised against a real
20+-row dataset (none exists in the seeded data for these three
tables) — the implementation mirrors `DataTable`'s and
`StaffListPage`'s already-proven pagination math/controls exactly,
so this is a low-risk, code-reviewed gap, not skipped verification.

---

## Module 15 — Design System Phase 3-4, sub-phase 4 (Dialogs: standardize on shared form controls) ✅ 2026-07-28

**Audit finding: dialog standardization was already largely in place.**
No `window.confirm`/`window.alert` anywhere; every real confirm/delete
flow (`EmployeeStatusPage`, `DocumentCenterPage`,
`DocumentManagementCenter`) already uses the shared `ConfirmDialog`;
every data-collecting dialog (`StaffLifecycleModal`,
`ApprovalDecisionModal`, `ReviewModal`, `DisburseModal`,
`VerificationModal`) already uses the shared `Modal` shell — correctly
not `ConfirmDialog`, since they need form fields `ConfirmDialog`'s
plain title/message/confirm shape doesn't support.

**Real gap found instead:** three dialogs (`ReviewModal`,
`DisburseModal`, `VerificationModal`) each duplicated an identical
~10-line inline `style={{...}}` object for a `<textarea>` (one also
for a `<select>`), and two more (`CreateStaffModal`'s Role,
`DocumentTypeFormModal`'s Category) used a completely **unstyled**
native `<select>` with zero styling at all — clashing visibly against
the polished `FormInput` fields next to them. Added `FormTextarea` and
`FormSelect` to `components/ui/FormLayout.tsx` (same `.input` CSS
class `FormInput` already uses, `FormTextarea` adds `resize: vertical`)
and migrated all five call sites onto them, deleting five duplicated
inline style objects.

**Verified:** frontend typecheck/lint/build clean (no backend
touched). Live in Chrome: `CreateStaffModal`'s Role select,
`DocumentTypeFormModal`'s Category select, and `VerificationModal`'s
status select + note textarea all confirmed rendering with the shared
control styling (border/radius/padding/chevron) instead of the old
bare/inline-styled versions, zero console errors. `ReviewModal`/
`DisburseModal` weren't live-triggered (would touch a real loan
application's approve/reject/disburse state) — same shared
`FormTextarea` component already confirmed working in three other live
instances, code-reviewed rather than re-verified live.

---

## Module 16 — Design System Phase 3-4, sub-phase 5 (Notifications: custom toast system) ✅ 2026-07-28

Built per the user's confirmed spec: custom, zero new dependencies,
reusing `Alert`'s variant color language and this app's own
`theme/motion.ts` variants. New `components/ui/Toast.tsx` +
`Toast.module.css`: `ToastProvider` (mounted once at the app root in
`main.tsx`, outermost — before `AuthProvider` — since it has no auth
dependency), `useToast()` returning `{ success, error, warning, info }`
called as `toast.success(message, options?)`, a `ToastCard` built on
`motion.div` + `slideInRightVariants`, auto-dismiss (default 5s,
`duration: 0` to require manual dismissal), manual dismiss, an
optional `action` button, and real queue management — at most 4 toasts
visible at once (`MAX_VISIBLE`); a 5th waits in the `toasts` array
past that index and only starts its own auto-dismiss timer once
promoted into the visible slice (a queued toast can't expire before
it's ever shown).

Migrated the 4 real one-shot `SuccessBanner` post-action-confirmation
call sites (`StaffListPage`, `DocumentTypesPage`, `ProfilePage`,
`PendingApprovalsPage`) to `toast.success(...)`. `Alert`/`SuccessBanner`
themselves are left in place, unused for now — no current persistent-
banner use case exists in this codebase, but removing a small, tested,
zero-maintenance component wasn't necessary for this task and the plan
explicitly called for keeping them available for that case.

**Real bug found and fixed during live verification, worth recording:**
the toast region's `role="region" aria-label="Notifications"` collided
with the Topbar's existing notification-bell link, which already used
that exact same accessible name — a real accessibility regression
(ambiguous landmark for screen-reader region navigation) that would've
shipped unnoticed by typecheck/lint/build. Renamed to `"Toast
notifications"`. Caught only because live verification queried the
DOM by that label and got the wrong element back.

**Debugging note, not a real bug:** initial live checks (via fast,
synchronous JS `element.click()` + immediate `getComputedStyle` reads,
completing in under a second) showed every toast stuck at its
`initial` animation values (`opacity: 0`, untranslated) and concluded
this was a broken animation. It wasn't — Chrome throttles
`requestAnimationFrame` on tabs that aren't genuinely
foregrounded/focused (true of an automation-controlled tab), so the
200ms slide-in animation was queued but never got enough real rAF
ticks to progress within the test's sub-second window, while the
`setTimeout`-based auto-dismiss timer (unaffected by rAF throttling)
fired on schedule regardless. Confirmed by switching to
screenshot-based verification (which has enough real round-trip
latency for rAF to catch up, same as a real user's active tab would
experience in under 200ms) — the toast renders and animates
correctly. Worth remembering for any future Framer-Motion
verification in this environment: don't trust millisecond-precision
JS timing checks for animation state; screenshot instead.

**Verified:** frontend typecheck/lint/build clean (no backend
touched). Live in Chrome: full lifecycle confirmed on `DocumentTypesPage`'s
Activate/Deactivate action — entrance animation, correct icon/color/
positioning, row-state update, auto-dismiss after 5s, and manual
dismiss via the X button, all working; zero console errors.
`StaffListPage`'s "Resend Invite" toast wasn't live-triggered (would
generate a real Firebase password-setup link on a seeded account) —
same `toast.success(...)` call already proven elsewhere, code-reviewed
instead.

---

## Module 17 — Design System Phase 3-4, sub-phase 6 (Loading experience: DocumentCenter grid skeleton) ✅ 2026-07-28

`DocumentCenterPage`'s Grid view showed a single page-level spinner
(`LoadingState`) on initial load — a coarser-grained pattern than
`DataTable`'s per-row shimmer `Skeleton` already used for List view
(`DataTable`'s own `data: null` handling). Added
`DocumentGridCardSkeleton` — a placeholder `Card` matching
`DocumentGridCard`'s exact field layout (checkbox/icon/menu row,
filename, type, customer link, size/date, status, two action buttons)
built from the existing `Skeleton` component (`variant="text"`/`"rect"`/
`"circle"`), rendered 8-up only when `viewMode === 'grid'` during the
initial fetch; List/Folders views keep their existing `LoadingState`/
`DataTable`-internal handling unchanged.

**Verified:** frontend typecheck/lint/build clean (no backend
touched). Live in Chrome: confirmed Grid view still renders correctly
with real data (42 documents) post-change, zero console errors. The
skeleton's own transient loading state wasn't live-triggered — local
dev fetch resolves faster than the automated browser can switch to
Grid view before data loads, and the page's Refresh action doesn't
reset state to `null` (pre-existing behavior, unrelated to this
change) — so there's no user-reachable moment to re-observe it after
initial mount. Code-reviewed instead: it's a straightforward
composition of the already-proven `Skeleton` primitive matching
`DocumentGridCard`'s real field shape.

---

## Module 18 — Design System Phase 3-4, sub-phase 7 (Micro-interactions: Card hover + motion consistency) ✅ 2026-07-28

Card's interactive hover treatment was already handled in sub-phase 1
(the `.interactive` variant, `SettingsHubPage`'s link-cards) — this
sub-phase's remaining scope was a spot-check across the rest of the
app: no other `Card` usage in the codebase is individually clickable
(`ReportsPage`/`CustomerDetailPage`/`DocumentCenterPage` all use it as
a static content-panel wrapper), so no further `.interactive` sites
exist.

**Two real gaps found during the motion/interaction spot-check:**
`NotificationsPage`'s notification-row `<button>` had `:hover` but no
`:focus-visible` (a real keyboard-accessibility gap missed by sub-phase
1's audit, which only covered `components/ui/`, not this feature's own
CSS module) — fixed using the same `--focus-ring-*` tokens.
`StaffListPage.module.css`'s `.tableRefreshing` opacity fade used a
hardcoded `0.15s ease` instead of the `--motion-duration-*`/
`--motion-ease-*` tokens every other transition in the app already
references — fixed to `var(--motion-duration-fast) var(--motion-ease-standard)`.
Grepped every `.module.css` transition for non-token duration values
project-wide to confirm these were the only two stragglers (the other
hit, `States.module.css`'s spinner `0.7s linear infinite`, is a
continuous-loop animation speed, not a one-shot UI-feedback transition
— doesn't map to any `--motion-duration-*` token and was left as-is).

**Verified:** frontend typecheck/lint/build clean (no backend
touched). Live in Chrome: confirmed the notification row's focus ring
renders correctly via real keyboard Tab navigation, zero console
errors.

---

## Module 19 — Design System Phase 3-4, sub-phase 8 (Responsiveness) ✅ 2026-07-28

**Environment constraint, encountered and worked around:** this
session's Chrome automation tooling's `resize_window` call reports
success but does not actually change the reported viewport
(`window.innerWidth` stays at the display's native 1600px regardless
of the requested size — confirmed by checking `window.innerWidth`
immediately after resize). True live narrow-viewport screenshot
verification isn't possible in this environment. Responsiveness was
instead verified via rigorous CSS-mechanics code review — reasoning
through exactly what each rule computes at narrow widths rather than
assuming.

**Confirmed already-safe by construction (no fix needed):** `Modal`'s
`.panel` (`width: 100%; max-width: 560px`) naturally shrinks to fit
any viewport narrower than 560px, since `width: 100%` resolves against
its padded fixed-position parent, not the max-width — verified via the
CSS box model, not a guess. `SettingsHubPage`/`DocumentCenterPage`'s
`repeat(auto-fill, minmax(220px, 1fr))` grids collapse to a single
column below ~250px of available width with zero explicit breakpoint
needed. `AppLayout.module.css`'s `.main { min-width: 0 }` already
guards against the classic flexbox overflow bug where a wide table
child would otherwise force the whole shell to overflow horizontally
— `DataTable`/`TableContainer`'s own `overflow-x: auto` wrapper
correctly contains scroll locally rather than leaking to the page.

**Real bugs found and fixed via a full z-index audit** (prompted by
noticing the mobile sidebar drawer's hardcoded `z-index: 200` while
reviewing `AppLayout.module.css` for viewport-safety — this was not
what the sub-phase set out to find, but a concrete stacking-order
collision worth fixing on discovery): the mobile sidebar drawer
(`Sidebar.module.css`) and `GlobalSearchDialog.module.css` (the Ctrl+K
command palette) each independently hardcoded `z-index: 200` — the
exact same value newly introduced for `--z-toast` in sub-phase 5,
meaning THREE unrelated full-screen overlays could occupy the same
stacking layer with DOM-order-dependent (i.e. undefined-in-practice)
paint order. Extended the token scale: `--z-sidebar-mobile-scrim: 150`,
`--z-sidebar-mobile: 160`, `--z-command-palette: 210` (command palette
stays above toast — it's an explicit full-takeover the user
summoned). All three consumers now reference tokens instead of
hardcoded numbers.

**Verified:** frontend typecheck/lint/build clean (no backend
touched). Live in Chrome: the `GlobalSearchDialog` fix (not
viewport-gated, so testable) confirmed rendering correctly with
`getComputedStyle` showing `z-index: 210` as expected, zero console
errors. The mobile sidebar drawer's fix is viewport-gated
(`@media (max-width: 768px)`) and — per the environment constraint
above — wasn't live-triggered; verified by the same rigorous code
review as the rest of this sub-phase.

---

## Module 20 — Design System Phase 3-4, sub-phase 9 (Accessibility) ✅ 2026-07-28

**`Modal.tsx`** — added a real focus trap (Tab/Shift+Tab cycle within
the panel's focusable descendants, wrapping at both ends), auto-focus
on open (first focusable descendant, or the panel itself as a
`tabIndex={-1}` fallback with `outline:none` since it's an anchor, not
a real interactive target), return-focus-to-trigger on close/unmount,
and Escape-to-close (`DropdownMenu` already had this; `Modal` didn't —
the gap found live during sub-phase 1). Added `role="dialog"`/
`aria-modal="true"`/`aria-label={title}`. The setup effect
deliberately runs once on mount/unmount only, not on every `onClose`
identity change — most call sites pass an inline
`onClose={() => setX(null)}` (a new function every render), and
re-running the effect on every render would re-capture "whatever has
focus right now" as the return-focus target, yanking focus away from
an input the user is actively typing into. The latest `onClose` is
read via a ref instead, updated every render without re-triggering
the effect — a real bug caught during implementation, not just a
style choice.

**`DropdownMenu.tsx`** — added arrow-key navigation
(Up/Down/Home/End) between `[role="menuitem"]` children, focus-into-
first-item on open, and return-focus-to-trigger on close — same
pattern as `Modal`'s fix, reusing the existing Escape/click-outside
handling already in place. No changes needed in either consumer
(`UserMenu`, `DocumentCenterPage`) — both already mark their items
`role="menuitem"`.

**`--color-text-tertiary` contrast** — audited and confirmed a real
AA failure: `#9498ad` on `--color-surface`/`--color-background` (its
actual light-mode usage, e.g. sort icons, folder counts, timestamps)
computed to 2.86:1, well under WCAG AA's 4.5:1 for normal text.
Dark-mode's identical value already passes (5.74:1 against the dark
background) — untouched. Changed the light-mode value only to
`#6c7089` (4.87:1 on surface, 4.54:1 on background), computed via the
WCAG relative-luminance formula rather than eyeballed, chosen to stay
visibly more muted than `--color-text-secondary` while clearing AA on
both backgrounds this token is actually used against.

**Verified:** frontend typecheck/lint/build clean (no backend
touched). Live in Chrome (before the session's Chrome extension
disconnected mid-verification — a genuine infrastructure hiccup,
confirmed unrecoverable after 4 retries over ~20s, not a code issue):
confirmed initial focus lands on the modal's first focusable
descendant (the close button, correctly — it precedes the form
fields in DOM order) and confirmed Shift+Tab from that first item
correctly wraps to the last item ("Create document type"), proving
the trap's core index-wrapping logic. Forward-Tab wrap-around,
Escape-to-close, `DropdownMenu`'s arrow-key nav, and the contrast
color change weren't re-verified live after the disconnect —
code-reviewed instead (same function/logic already partially proven
live, or a pure CSS value change with no interactive-logic risk).

---

## Module 21 — Design System Phase 3-4, sub-phase 10 (Branding) ✅ 2026-07-28

**`AuthLayout.tsx`** — replaced the bare `{APP_NAME.charAt(0)}` "L"
placeholder (the last one in the app; `Sidebar.tsx` already used the
real asset since the earlier Admin Panel branding fix) with the same
real logo asset, mirroring `Sidebar.tsx`'s exact proven pattern
(`import logoMark from '.../app_icon.png'` → `<img src={logoMark}
alt={APP_NAME} className={styles.brandMark} />`). Updated
`AuthLayout.module.css`'s `.brandMark` to match `Sidebar.module.css`'s
image-display treatment (`object-fit: cover`, a white backing in case
of transparency, subtle shadow) instead of the old flex-centered-text
styling that no longer applies to an `<img>`.

**Favicon** — `index.html` had none at all. Added
`<link rel="icon" type="image/png" href="/src/assets/branding/app_icon.png" />`,
reusing the same already-imported asset rather than adding a new file.
Confirmed via the production build that Vite's HTML asset pipeline
correctly rewrites this to the hashed `dist/assets/app_icon-*.png` —
the exact same hash Sidebar's module-imported copy already produces,
i.e. Vite deduplicated it rather than emitting a second copy.

**Verified:** frontend typecheck/lint/build clean (no backend
touched); confirmed the favicon `<link>` resolves (200) in both dev
and the production build output, and is present site-wide (checked on
the dashboard page, not just conceptually on login), zero console
errors. `AuthLayout` itself wasn't re-rendered live in Chrome — doing
so requires signing out, which risks losing the persisted admin
session this whole initiative's live verification has depended on
across all 10 sub-phases so far — verified instead via: (1) the change
is a mechanical, syntactically identical copy of `Sidebar.tsx`'s
`<img>` pattern, which has rendered correctly in every single
screenshot taken this session; (2) typecheck/build passing confirms
the image import itself resolves at compile time; (3) the dev server
directly serving the referenced asset path at 200.

---

## Module 22 — Design System Phase 3-4, sub-phase 11 (Performance) ✅ 2026-07-28

**Route-level code-splitting** — `app/router.tsx`'s ~20 feature-page
imports (every route element nested under `AppLayout`) converted from
static `import` to `React.lazy(() => import('...').then((m) => ({
default: m.ComponentName })))`, confirmed by the original pre-planning
audit to be the real contributor to the single ~700KB eager JS chunk
Vite already warned about on every build this session. `AppLayout`,
`ProtectedRoute`, and `LoginPage` stay eager — the shell/auth-guard is
structural (needed for every route regardless) and `LoginPage` is the
actual first paint for a fresh unauthenticated visit, so lazy-loading
it would add a network round-trip before the very first thing most
visitors see. One `<Suspense>` wraps `RouterProvider` at the router
root (not one per route) — `RouterProvider` has no children slot, so
this is both simpler and sufficient, since Suspense catches a
suspended lazy import anywhere in its subtree; falls back to the
existing `LoadingState` full-page treatment, no new component.

**Vendor chunk splitting** — `vite.config.ts` gained
`build.rollupOptions.output.manualChunks`, grouping
`react`/`react-dom`/`react-router-dom`/`framer-motion`/`axios` into a
dedicated `vendor` chunk, cached independently from app code that
changes far more often.

**Result:** the main entry chunk dropped from ~707KB to 209.26KB
(gzip 49.10KB); a new `vendor` chunk at 368.53KB (gzip 122.47KB)
carries the split-out libraries; ~35 small per-route/component chunks
(0.2KB–16KB each) now load on demand. The "chunk larger than 500kB"
Vite build warning present in every prior build this session is gone
entirely.

**Deliberately deferred (not this sub-phase):** the `ReportsPage`
cross-page-refetch-duplication finding from the original audit (it
re-fetches data other pages already fetched, no shared cache layer) —
fixing it properly needs a caching layer or a new dependency
(e.g. react-query), out of scope for a no-new-dependency polish pass.
Noted here and in project memory as a real, known, future item — not
silently dropped.

**Verified:** frontend typecheck/lint clean; production build
confirms the bundle-size result above (no backend touched, no
migration). Live in Chrome against the real seeded admin session:
navigated to four distinct lazy-loaded routes (`/dashboard`,
`/settings/document-types`, `/documents`, `/reports`) — each rendered
its real data correctly (15 applications, the real document-type
catalog including the QA test type, 42 real documents, the real
Reports widgets) with zero console errors and no visible
Suspense-fallback flash between navigations.

---

## Module 23 — Design System Phase 3-4, sub-phase 12 (Final QA) ✅ 2026-07-28

**This closes the 12-sub-phase Design System Phase 3-4 initiative** —
Enterprise UI Polish & Production Readiness. No code changes this
sub-phase; final verification only, per the plan's own scope ("Full
live Chrome walkthrough... Full backend+frontend test suite run.
Final memory update.").

**Full test suite:** backend — 147/147 tests pass across 17 suites
(`npx jest`); `npx tsc --noEmit` clean. Frontend — `npx tsc -b
--noEmit` clean; `npx eslint "src/**/*.{ts,tsx}"` clean (same 3
pre-existing warnings as every prior sub-phase — Toast.tsx/
auth-context.tsx react-refresh, main.tsx import style — no new
issues); `npm run build` clean, confirming sub-phase 11's bundle-split
result is stable.

**Live Chrome walkthrough** against the real seeded QA Admin session,
covering every screen named in the original brief: Dashboard,
Applications (list + a real Customer 360 navigation from an applicant
name), Customer 360 (full profile/stats/timeline render), Documents
(Document Center), Global Search (Ctrl+K, live "zainul" query
returning a real, keyboard-navigable Customers result), Settings hub,
Settings → Document Types (a full Activate→Deactivate round trip),
Settings → Profile, Notifications, and Settings → Approvals (the
maker-checker queue, correct empty state). Every screen rendered its
real data correctly with zero console errors across the whole
walkthrough.

**Toast system verified under real multi-toast conditions** — not
just single-toast in sub-phase 5: activating then immediately
deactivating the QA test document type fired two `toast.success(...)`
calls back to back, and the screenshot caught both mid-transition
simultaneously (the first fading out, the second sliding in above
it) — real stacking/queue behavior, not just each toast tested in
isolation.

**One test artifact, not a bug, worth recording:** re-opening the
Global Search dialog (Ctrl+K) after a prior search preserves the
input's previous value rather than clearing it — typing into it
without first clearing appended to the old query (e.g. "zainul" typed
into an already-"zainul"-filled input became "zainulzainul", which
correctly returned no results). Confirmed as correct, expected input
behavior (not a state-reset bug) once the field was cleared first —
included here only so a future session doesn't misdiagnose the same
thing as a search regression.

**Environment note, consistent with every prior sub-phase's live
checks this session:** every full browser `navigate()` (as opposed to
an in-app client-side link click) briefly shows the app's own
"Signing in…" Firebase-auth-bootstrap screen before the real page
renders — this is expected app behavior on a fresh page load, not a
bug or a regression, and resolves within roughly a second every time.

**With this, all 12 sub-phases of Design System Phase 3-4 are
complete:** 1. Foundation (tokens/focus-states/dedupe) — 2. Forms — 3.
Tables — 4. Dialogs — 5. Notifications (toast system) — 6. Loading
experience — 7. Micro-interactions — 8. Responsiveness — 9.
Accessibility — 10. Branding — 11. Performance — 12. Final QA. See
[[project_design_system_phase34]] for the full per-sub-phase record.

---

## Module 24 — Employee CRM, sub-phase 0 (Foundation) ✅ 2026-07-28

**What:** first sub-phase of a new highest-priority initiative, kicked
off immediately after the system-wide freeze that closed out Design
System Phase 3-4 (see [[admin_panel_frozen]]/[[customer_app_frozen]]).
Full architecture/audit/plan (existing backend capabilities, genuine
gaps, UI/UX plan, DB/API mapping, implementation order) was presented
and approved before any code was written — see
`.claude/plans/linear-swinging-squirrel.md` and
[[project_employee_crm]]. The audit's headline finding: most of
"Employee CRM" already existed and worked — Assigned Leads, Lead
Detail (Timeline/Audit Trail/Documents/Notes/Approve-Reject-Query/
Disburse), Customer 360, Notifications, basic Profile, and self-service
status were all already fully wired for the `EMPLOYEE` role. The real
gaps: no Employee Dashboard, `GET /v1/customers` wasn't scoped to
assigned customers, and no Task/Follow-up/Reminder/Call-Note concept
existed anywhere.

**User-directed architecture refinement:** rather than reuse Admin's
`/dashboard` route with a role switch (the original draft), the
Employee experience gets a **completely separate URL namespace and nav
structure** — `/employee/*`, with its own `EMPLOYEE_NAV_ITEMS` config,
never merged with admin's `NAV_ITEMS`. Admin stays completely
untouched and frozen.

**Backend — one new entity covering four of the plan's asks at once:**
`FollowUpEntity`/`follow_ups` (migration `AddFollowUps`, run/revert/run
verified live) — `dueAt` being today makes it a task for today,
`status = pending` makes it a pending follow-up, `note` is the call
note, `dueAt` itself is the next follow-up date. CRUD
(`POST/GET/PATCH /v1/follow-ups*`, employee-only), ownership-scoped via
the same "Lead Locking" pattern `LoanApplicationsService.updateNotes`
already established. Reminders are passive (due-today/overdue query
filters) this round — no scheduler infrastructure exists in this
codebase to fire proactive push alerts; explicitly deferred, not
silently dropped. Separately: `GET /v1/customers` now scopes an
`EMPLOYEE` caller to their assigned customers
(`findDistinctApplicantIdsAssignedTo`, the same primitive Document
Center/Search already use) instead of returning every customer —
closes a real data-exposure gap the audit found; traced every frontend
caller first to confirm this is behaviorally invisible to admin (only
the admin-only, frozen `AdminDashboardPage` used the unscoped list).

**Admin Panel — the routing/nav split, plus fixing every regression it
would have introduced:** new `/employee/dashboard|my-leads|
my-customers|follow-ups|documents|notifications|profile` route tree.
Dashboard/My Customers/Follow-ups are `ComingSoonPage` placeholders
until sub-phases 1-3 build the real screens (same convention `/tasks`
and `/customers` already use for admin) — every commit stays in a
fully working state, nothing is ever left broken mid-initiative. The
already-built `LeadDetailPage`/`MyLeadsPage`/`DocumentCenterPage`/
`NotificationsPage`/`ProfilePage`/`CustomerDetailPage` are reused
unmodified at their new employee paths; the old shared routes
(`/my-leads`, `/documents`, `/notifications`, `/settings/profile`,
`/customers/:id`) narrowed to admin-only. Because several of those
old paths were previously reachable by employees, narrowing them
created real navigation dead-ends this sub-phase had to fix in the
same pass: `GlobalSearchDialog`'s result deep-links, `NotificationsPage`'s
loan-application deep-link, `MyLeadsPage`'s row click,
`LeadDetailPage`'s back-button and Customer 360 link,
`DocumentCenterPage`'s owner-name links, and `UserMenu`'s "My Profile"
link are all now role-aware (employee → `/employee/*`, admin →
unchanged). Also extracted a shared `StatusBadge` component from three
independent hand-rolled "colored dot + label" implementations
(`MyLeadsPage`, `CustomerDetailPage`, `EmployeeStatusPage`) found
during the audit — mechanical, no visual change.

**Verified:** backend 170/170 tests pass (+11 new — `customers.service.spec.ts`'s
scoping tests, `follow-ups.service.spec.ts`'s ownership/status tests),
`tsc --noEmit` clean, migration run→revert→run cycle confirmed
symmetric. Frontend `tsc -b`/eslint/build all clean. Live-verified in
Chrome against the real QA Admin account: Customer 360, Document
Center, Lead Assignment, Lead Detail, the extracted `StatusBadge`,
`UserMenu`'s My Profile link, and Global Search all still work
correctly for admin after the restructuring, zero console errors.
**The new `/employee/*` routes could not be live-verified this
session** — staff accounts are provisioned via Firebase invite-link,
and no password is known for the seeded Test Employee account in this
environment; flagged transparently rather than claimed as tested. A
future session with real employee credentials (or the user testing
directly) should walk through `/employee/my-leads` and
`/employee/my-leads/:id` at minimum, since those are the two employee
routes carrying real, previously-shipped functionality forward.

---

## Module 25 — Employee CRM, sub-phase 1 (Employee Dashboard) ✅ 2026-07-28

**What:** employees now land on a real dashboard at `/employee/dashboard`
instead of the generic placeholder every role previously saw.

**Backend:** new `GET /v1/employee-dashboard/summary`, its own small
module composing already-existing repository queries
(`LoanApplicationRepository`'s workload counts — the same ones
`LeadAssignmentService.getEmployeesWithWorkload` already uses for the
admin roster) plus the new `FollowUpRepository` counts from sub-phase
0 and `WorkStatusService.getMyStatus` (exported from `WorkStatusModule`
for reuse rather than duplicating its `isBreakStatus` mapping).
Deliberately its own module, not bolted onto `WorkStatusController`.

**Admin Panel:** `EmployeeDashboardPage` — status badge, 5 `StatCard`s
(active/pending/today's leads, pending/due-today follow-ups, each
clickable through to the relevant list) and quick-link cards to My
Leads/My Customers/Follow-ups/Documents, reusing the exact
Card+Link pattern `SettingsHubPage` already established. Mounted at
the existing `/employee/dashboard` route, replacing sub-phase 0's
`ComingSoonPage` placeholder. New `shared-types/src/employee-dashboard.ts`
mirrors the response shape.

**Verified:** backend 171/171 tests (+1 new), `tsc --noEmit` clean.
Frontend `tsc -b`/eslint/build clean. Live-checked: the new endpoint
resolves to `401` (correctly guarded, not `404`); re-confirmed the
admin Dashboard still renders correctly with real data and zero
console errors after the shared-types rebuild and new module
registration. Same disclosed gap as sub-phase 0: the employee-facing
page itself couldn't be seen rendering — no employee test credentials
available in this environment.

---

## Module 26 — Employee CRM, sub-phase 2 (My Customers) ✅ 2026-07-28

**What:** new `MyCustomersPage` at `/employee/my-customers`, listing
the employee's own assigned customers and linking into the
already-fully-built `CustomerDetailPage` at `/employee/my-customers/:id`
(wired in sub-phase 0). `GET /v1/customers` was already scoped
server-side to the caller's assigned customers by sub-phase 0's
`CustomersService.listCustomers` change, so this page is pure UI —
same fetch-once/filter-client-side shape as `MyLeadsPage`, for the
same reason (one employee's customer count doesn't warrant
server-side paging).

**Also:** renamed `features/employee-dashboard/` to `features/employee/`
(`git mv`, history preserved) — a folder named after one screen no
longer fit once a second Employee CRM screen landed in it; sub-phase
3's Follow-ups screen will live here too.

**Verified:** frontend `tsc -b`/eslint/build all clean. Live-checked:
admin Dashboard's Active Customers count and Employee Workload
Summary still render correctly with zero console errors — confirms
the sub-phase 0 customer-listing scope change remains invisible to
admin. Same disclosed gap as every prior sub-phase: the employee-facing
page itself couldn't be seen rendering (no employee test credentials
in this environment).

---

## Up next

Employee CRM sub-phases 0-2 done. Remaining: 3 (Follow-up Management
UI), 4 (Status Updates polish), 5 (Profile + Performance Summary) —
see `.claude/plans/linear-swinging-squirrel.md` for the full plan.
Executing autonomously, one sub-phase per implement→verify→commit→
push→document cycle, per the user's explicit instruction — no pause
for approval except on architectural/security decisions.

Design System Phase 3-4 (Enterprise UI Polish & Production Readiness)
is complete — all 12 sub-phases done. Admin Panel and backend business
logic are frozen (bug fixes only) while Employee CRM is the active
initiative — see [[admin_panel_frozen]]/[[customer_app_frozen]].

Deferred indefinitely (no backend domain exists): Task Management (as
a generic concept beyond Employee CRM's lead-scoped Follow-ups),
Branch Management, Revenue/Finance, Loan Products, dynamic RBAC, Email
Templates. Also on record as explicitly deferred (not forgotten): the
`ReportsPage` cross-page-refetch-duplication finding (needs a caching
layer/new dependency), in-app route-navigation blocking via
`useBlocker` for unsaved changes, and proactive push-on-due-date for
Follow-up Reminders (needs new scheduler infrastructure).
