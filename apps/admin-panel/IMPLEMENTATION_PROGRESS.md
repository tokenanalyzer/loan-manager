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

---

## Up next

Per the approved blueprint's build order: Customer 360 (retires the
KYC review screens currently orphaned in the frozen legacy Flutter
Employee App), then the Lead Pipeline/Documents visual pass, then Banks
&amp; Partners, then Analytics, then Audit Log.
