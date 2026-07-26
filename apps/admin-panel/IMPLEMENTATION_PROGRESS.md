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

## Module 2 — Admin Authentication (in progress, phase 1 of 7) 🚧 2026-07-25

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

---

## Up next

Per the approved blueprint's build order: Customer 360 (retires the
KYC review screens currently orphaned in the frozen legacy Flutter
Employee App), then the Lead Pipeline/Documents visual pass, then Banks
&amp; Partners, then Analytics, then Audit Log.
