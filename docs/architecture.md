# Architecture Overview

This document describes the repository foundation (Phase 1), the core
development environment built on top of it (Phase 2), the database
schema/migrations added in Phase 3, Firebase Authentication added in
Phase 4, the CRM/loan-form business logic added in Phase 5, the
Customer App production experience built in Phase 6, and the
production-readiness audit and hardening done in Phase 7.

## Monorepo layout

```
loan-manager/
├── apps/
│   ├── backend/          NestJS API service
│   ├── admin-panel/      React + Vite admin web app
│   ├── customer-app/     Flutter app for customers
│   └── employee-app/     Flutter app for employees
├── packages/
│   ├── shared-types/     Shared TypeScript types (backend <-> admin panel)
│   ├── shared-flutter/   Shared Dart code (customer app <-> employee app)
│   └── shared-config/    Shared ESLint/Prettier configuration
├── infra/
│   └── docker/           docker-compose stack: Postgres, backend, admin panel
├── .github/workflows/    CI pipelines (lint, typecheck, build, test, docker)
└── docs/                 Architecture and process documentation
```

## Workspace tooling

| Concern                          | Tool                                |
| -------------------------------- | ----------------------------------- |
| JS/TS package management         | pnpm workspaces                     |
| JS/TS task orchestration/caching | Turborepo                           |
| Flutter/Dart workspace           | Melos                               |
| Linting (TS)                     | ESLint (shared config package)      |
| Linting (Dart)                   | flutter_lints                       |
| Formatting (TS/JS/JSON/MD)       | Prettier                            |
| Formatting (Dart)                | `dart format`                       |
| Local infra                      | Docker Compose (Postgres, services) |
| CI                               | GitHub Actions                      |

## Phase 1 — Foundation (recap)

Folder structure, dependency wiring, lint/format/build configuration,
Docker, and CI. See git history / CHANGELOG for the full file list.

## Phase 2 — Core Development Environment

### Backend (NestJS)

- **Server configuration** (`src/main.ts`): Helmet security headers,
  configurable CORS, a global `ValidationPipe` (whitelist + transform,
  ready for future DTOs), URI-based API versioning, and
  `enableShutdownHooks()` for graceful container shutdown.
- **Environment configuration** (`src/config/`): a Joi schema
  (`env.validation.ts`) validates `process.env` at boot — the process
  fails fast with a clear error instead of starting half-configured.
  `configuration.ts` exposes typed, namespaced config (`app.*`,
  `database.*`, `firebase.*`) via `ConfigService`.
- **PostgreSQL connection** (`src/database/database.module.ts`): a
  `TypeOrmModule.forRootAsync` connection with `entities: []` and
  `synchronize: false` — deliberately zero schema. `src/database/data-source.ts`
  is a standalone `DataSource` for the TypeORM CLI so
  `migration:generate`/`migration:run` are ready to use the moment
  entities exist.
- **Logger** (`src/logger/logger.module.ts`): structured logging via
  `nestjs-pino` — pretty-printed in development, JSON in production,
  a correlation id per request, and header redaction
  (`authorization`, `cookie`).
- **Global error handling** (`src/common/filters/all-exceptions.filter.ts`):
  catches every unhandled exception, logs it once with context, and
  returns a consistent JSON error shape to clients.
- **Firebase Admin placeholder** (`src/firebase/`): wires up _how_
  Firebase Admin will initialize (project id / client email / private
  key from env), but resolves to `null` and logs a warning instead of
  throwing when `FIREBASE_ENABLED=false` or credentials are missing —
  the backend still starts successfully without a real Firebase project.
- **Repository pattern** (`src/common/repository/base.repository.ts`):
  a generic `BaseRepository<T>` wrapping TypeORM's `Repository<T>`,
  ready for feature repositories to extend once entities exist.
- No controllers, guards, or routes are registered — there are no
  APIs yet by design.

### Admin Panel (React + Vite)

- **Environment configuration** (`src/core/env.ts`): typed wrapper
  around `import.meta.env.VITE_*`.
- **API client architecture** (`src/lib/api-client.ts`): a
  pre-configured Axios instance with request/response interceptors
  (logging + error normalization). No endpoint methods or auth token
  attachment yet — no APIs and no login exist to call.
- **Routing** (`src/app/router.tsx`): `react-router-dom` with a single
  placeholder route (`StatusPage`) that displays the resolved API base
  URL, sufficient to verify the build/env wiring end-to-end.

### Flutter apps (Customer + Employee)

Both apps share an identical Phase 2 structure:

```
lib/
├── core/
│   ├── config/env_config.dart      # compile-time env via --dart-define-from-file
│   ├── di/injection.dart           # manual GetIt registration (no codegen)
│   ├── firebase/                   # guarded Firebase bootstrap + placeholder options
│   ├── router/app_router.dart      # go_router, one placeholder route
│   └── app.dart                    # root MaterialApp.router widget
├── features/home/home_screen.dart  # minimal screen to verify the app runs
└── main.dart                       # bootstrap: DI -> Firebase -> runApp
env/
├── development.json                # --dart-define-from-file target
├── staging.json
└── production.json
```

- **Environment configuration**: rather than a runtime `.env` file
  (which would need to be declared as a Flutter asset and would break
  the build if the file were missing), Phase 2 uses Dart's compile-time
  `--dart-define-from-file=env/<name>.json` mechanism. `EnvConfig` reads
  these via `String.fromEnvironment`/`bool.fromEnvironment` with sane
  defaults, so the app builds and runs correctly even with zero flags.
- **Dependency injection**: a manually-wired `GetIt` container
  (`configureDependencies()`). Deliberately _not_ using code-generated
  DI (e.g. `injectable` + `build_runner`) yet, so the app compiles
  without a codegen step being run first.
- **Firebase placeholder**: `firebase_options_placeholder.dart` mirrors
  the shape FlutterFire CLI generates, with empty values. Real project
  values arrive via `flutterfire configure` in a later phase. Bootstrap
  is a no-op unless `FIREBASE_ENABLED=true` is compiled in.
- **Shared theme** (`packages/shared-flutter/lib/src/theme/`): a single
  `AppTheme` (light/dark, Material 3) used by both apps' `MaterialApp.router`.
- **API client + repository pattern** (`packages/shared-flutter/lib/src/network/`,
  `.../repository/`): a Dio-based `ApiClient` returning a sealed
  `ApiResult<T>` (`ApiSuccess`/`ApiFailure`), and a `BaseRepository` for
  feature repositories to extend. No endpoint calls exist yet.
- **Logger** (`packages/shared-flutter/lib/src/logging/app_logger.dart`):
  shared wrapper around the `logger` package, used identically by both apps.

### Known follow-up work (not in Phase 2 scope)

- **No native platform folders.** Neither Flutter app has `android/`,
  `ios/`, or `web/` directories yet (these are normally generated by
  `flutter create`, which requires the Flutter SDK — unavailable in
  the environment this phase was authored in). `flutter analyze`,
  `flutter test`, and `flutter pub get` all work without them; only
  `flutter run`/`flutter build apk`/`ios`/`web` need them. Run
  `flutter create .` inside each app once to add them non-destructively.
- **No `pnpm-lock.yaml` committed yet**, for the same reason (no
  network access to the npm registry when this phase was authored).
  CI currently runs `pnpm install --no-frozen-lockfile`. Once a real
  lockfile is committed (via `pnpm install` in an environment with
  network access), tighten CI back to `--frozen-lockfile` and restore
  `cache: pnpm` in `actions/setup-node` for reproducible, cached installs.

## Phase 3 — Database Schema & Migrations

### Entities (`src/database/entities/`)

Eight entities model the loan domain. All extend `AbstractEntity`
(UUID primary key, `createdAt`/`updatedAt`, soft delete via
`deletedAt`) except `AuditLogEntity`, which is append-only by design:

- **`UserEntity`** (`users`) — shared identity for customers,
  employees, and admins, keyed to Firebase Authentication via
  `firebaseUid`. `role` is a plain enum column — no authorization
  logic is implemented against it.
- **`CustomerProfileEntity`** / **`EmployeeProfileEntity`**
  (`customer_profiles` / `employee_profiles`) — 1:1 extensions of
  `UserEntity` holding role-specific fields, kept in separate tables
  so customer rows never carry employee-only columns and vice versa.
- **`LoanApplicationEntity`** (`loan_applications`) — a customer's
  request for a loan, prior to approval.
- **`LoanEntity`** (`loans`) — an approved/active loan, optionally
  originating from a `LoanApplicationEntity` (1:1, nullable).
- **`PaymentEntity`** (`payments`) — scheduled/made repayments
  against a loan (1 loan : many payments).
- **`DocumentEntity`** (`documents`) — metadata for a file stored in
  Firebase Storage (identity docs, signed agreements, etc.); stores a
  `storagePath` reference only — no upload/download logic.
- **`AuditLogEntity`** (`audit_logs`) — a generic, append-only audit
  trail (`actorId`, `action`, `entityName`/`entityId`, `metadata` jsonb).

None of these entities have concrete repositories, services,
controllers, or validation rules attached yet — Phase 3 is schema
only. `BaseRepository<T>` from Phase 2 is ready for feature
repositories to extend once that work begins.

### Naming strategy

`typeorm-naming-strategies`' `SnakeNamingStrategy` is applied in both
`database.module.ts` (runtime) and `data-source.ts` (CLI), so
`firebaseUid` ↔ `firebase_uid` conversions happen identically in both
places. Every `@Index`/`@Unique`/`@JoinColumn` in the entities is
given an **explicit** name matching the migration exactly (rather than
relying on TypeORM's auto-generated names), so a future
`migration:generate` run diffs cleanly against these entities instead
of proposing to rename every constraint.

### Migration (`src/database/migrations/1783767718032-InitialSchema.ts`)

**Hand-written, not CLI-generated** — `typeorm migration:generate`
needs a live database connection to diff against, which wasn't
available in the environment this phase was authored in (no network,
no running Postgres). The migration was written to match every entity
field-for-field (types, nullability, defaults, constraint/index names)
and reviewed against each entity, but **treat it as unverified until
run against a real database**:

```bash
docker compose -f infra/docker/docker-compose.yml up -d postgres
cd apps/backend && pnpm migration:run
```

If `migration:run` reveals any drift from the entities, prefer
generating a corrective migration (`pnpm migration:generate`) over
hand-editing the initial one, once the database is reachable.

### Known follow-up work (Phase 3)

- The initial migration needs to be run against a real Postgres
  instance at least once to confirm it applies cleanly — see above.
- No concrete repositories exist yet (e.g. `UserRepository extends
BaseRepository<UserEntity>`) — only the generic `BaseRepository<T>`
  base and the entities themselves. Deferred so this phase stays
  scoped to schema/models, not data-access code.
- No indexes/constraints beyond what's listed above have been
  considered for query patterns that don't exist yet (no APIs query
  this schema so far) — revisit once real query patterns emerge.

## Phase boundaries (Phase 3)

Phase 3 deliberately stopped at schema: entities, enums, relationships,
constraints, indexes, and the migration that creates them.

## Phase 4 — Firebase Authentication (Login/OTP)

### Design decisions and why

- **Customer App: Phone + OTP.** Firebase Phone Authentication sends
  and verifies the OTP entirely client-side/via Firebase's own
  infrastructure — the backend never sends an SMS or sees the code,
  it only verifies the resulting ID token.
- **Employee App & Admin Panel: Email + password.** Both assume
  pre-provisioned accounts (no self-service sign-up) — appropriate for
  internal staff/admin users, unlike the self-service Customer App.
- **The backend never lets a client self-assign a role.** This is the
  single most important security decision in this phase. `AuthService.
syncFromFirebaseToken` always creates first-time sign-ins as
  `UserRole.CUSTOMER`. An Employee or Admin's Firebase sign-in only
  resolves to their real role if a `users` row with that role _already
  exists_ for their `firebaseUid` — provisioned by some process outside
  this endpoint (an admin-invite/seeding flow is explicitly future
  work). Without this, anyone with a merely-valid Firebase token could
  hit the sync endpoint and receive an employee/admin-level account.
- **Firebase Admin verifies tokens; it doesn't send OTPs.** `FirebaseAuthGuard`
  calls `verifyIdToken` — nothing in this backend calls Firebase's
  phone-auth or SMS APIs directly.
- **Every surface stays optional.** `FIREBASE_ENABLED=false` (backend),
  `EnvConfig.firebaseEnabled` (Flutter), and `env.firebase.enabled`
  (admin panel) all default to false. Every login screen checks this
  _before_ touching the Firebase SDK, showing a "not configured" state
  instead — preserving the "builds and runs without a real Firebase
  project" property established in Phase 2.

### Backend (`apps/backend/src/auth/`, `src/users/`)

- **`FirebaseAuthGuard`** — verifies the `Authorization: Bearer <token>`
  header via `getAuth(app).verifyIdToken()`, attaching the decoded
  token to the request as `firebaseUser`. Returns 503 (not 401) when
  Firebase Admin itself isn't configured — that's a deployment
  problem, not a caller auth failure.
- **`@CurrentUser()`** — param decorator extracting `request.firebaseUser`.
- **`AuthService.syncFromFirebaseToken`** — find-or-create against the
  `users` table (see the role-safety note above).
- **`UserRepository`** — the first concrete repository extending
  Phase 2's generic `BaseRepository<T>`.
- **`AuthController`** — exactly two endpoints: `POST /v1/auth/session`
  (call right after client-side sign-in) and `GET /v1/auth/me`. No
  other user/profile-management endpoints exist yet.

### Shared Flutter (`packages/shared-flutter/lib/src/auth/`, `src/network/`)

- **`AuthState`** — a sealed class (`AuthInitial`/`AuthUnauthenticated`/
  `AuthSyncing`/`AuthAuthenticated`/`AuthError`) so UI code must handle
  every state explicitly.
- **`AuthController`** — listens to `FirebaseAuth.authStateChanges()`
  and reacts: on sign-in, attaches the ID token to `ApiClient` and
  calls `POST /v1/auth/session`; on sign-out, clears it. It does
  **not** initiate sign-in — each app does that via its own repository.
- **`ApiClient.setAuthTokenProvider`** — a callback invoked fresh on
  every request (not a static header set once), so a refreshed Firebase
  ID token is always used.

### Customer App (`lib/core/auth/`, `lib/features/auth/`)

`CustomerAuthRepository` wraps `verifyPhoneNumber`/`signInWithCredential`.
`PhoneEntryScreen` → `OtpVerificationScreen` is the two-step flow. The
router's `redirect` gates `/` behind `AuthController.state`, using
`refreshListenable` so navigation reacts live to auth changes.

### Employee App (`lib/core/auth/`, `lib/features/auth/`)

`EmployeeAuthRepository` wraps `signInWithEmailAndPassword` (+ password
reset). `LoginScreen` is a single email/password form — no sign-up.
Router gating mirrors the Customer App.

### Admin Panel (`src/core/`, `src/features/auth/`, `src/app/`)

`firebase.ts` guards JS SDK initialization the same way. `AuthProvider`/
`useAuth()` mirrors the Flutter `AuthController`'s responsibilities in
React (listen → sync → expose state). `ProtectedRoute` gates the
existing `StatusPage`; `LoginPage` is the sign-in form.

### Schema correction: `AlterUsersRelaxRequiredProfileFields`

Implementing phone-only sign-up surfaced a real conflict with Phase 3:
`users.email` and `users.full_name` were `NOT NULL`, but Firebase Phone
Authentication frequently provides neither. Rather than editing the
already-committed Phase 3 migration (`1783767718032-InitialSchema.ts`),
schema evolution happened via a new, additive migration
(`1783769475535-AlterUsersRelaxRequiredProfileFields.ts`) that relaxes
both columns to nullable — the normal, safe pattern once a migration
has shipped. `UserEntity` and `UserProfileResponseDto` were updated to
match (both fields are now `string | null`).

### Known follow-up work (Phase 4)

- **No admin-invite/seeding flow.** Employee/admin accounts must be
  inserted into `users` manually (e.g. a one-off SQL insert or a
  future seed script) before their Firebase sign-in will resolve to
  that role — there's no UI or endpoint for provisioning them yet.
- **No password-reset UI on the Customer App** (phone/OTP doesn't need
  one) or rate-limiting on OTP requests — left for a security-hardening
  pass once real SMS costs/abuse patterns are a concern.
- **No profile-completion flow** to populate the now-nullable
  `email`/`full_name` fields for phone-only customers.
- **This migration hasn't been run against a real database either** —
  same caveat as Phase 3's initial migration; verify both together.

## Phase boundaries (Phase 4)

Phase 4 deliberately stopped at authentication: token verification,
session sync, and login UI.

## Phase 5 — CRM & Loan-Form Business Logic

### Design decisions and why

- **Role-based access control is a guard chain, not a single check.**
  `@Auth(...roles)` composes three guards in order:
  `FirebaseAuthGuard` (verify token) → `SyncUserGuard` (attach the
  synced `UserEntity` as `request.appUser`) → `RolesGuard` (enforce
  `@Roles(...)` against `appUser.role`). Splitting these into three
  single-purpose guards (rather than one guard doing everything) keeps
  each piece independently testable and matches Nest's own guard
  composition model. `@Auth()` with no arguments means "any
  authenticated role" — it still runs all three guards (so
  `@CurrentAppUser()` is always available), just doesn't restrict by role.
- **Approval creates a real `Loan`, synchronously, in the same
  request.** `LoanApplicationsService.review` is the first place in
  the project where one business event (a decision) produces another
  entity (a `Loan`) as a side effect. This intentionally happens
  inline rather than via an event/queue — at this scale, synchronous
  and simple is more debuggable than eventual consistency for a
  workflow this size. Revisit if/when disbursement gets its own
  multi-step process.
- **State transitions are enforced with exceptions, not silently
  ignored.** Reviewing an already-decided application throws
  `ConflictException` (409) rather than silently no-op'ing or
  re-deciding it — callers get an explicit, actionable error.
- **Business rule constants live next to the module that enforces
  them** (`loan-applications/loan-application.constants.ts`), not in
  global config — they're product rules, not environment config.
- **CRM is read-only for employees.** Employees can look customers up
  but not edit their profile — only the customer themselves can, via
  `PATCH /v1/customers/me`. An employee-facing edit capability, if
  ever needed, is a deliberate future decision, not an oversight.
- **Clients do not duplicate business rules.** Amount/term bounds,
  state-transition rules, and role checks are enforced exactly once,
  server-side. Flutter forms only do UI-level sanity checks (e.g. "is
  this a positive number") and surface whatever error the backend
  actually returns — this is why bumping `LOAN_APPLICATION_RULES` only
  requires a backend change.

### Backend (`apps/backend/src/loan-applications/`, `src/customers/`, `src/auth/`)

- **`SyncUserGuard`** (`src/auth/guards/sync-user.guard.ts`) — attaches
  `request.appUser` by calling the same `AuthService.syncFromFirebaseToken`
  used by the auth endpoints. Must run after `FirebaseAuthGuard` in
  the guard list (reads `request.firebaseUser`).
- **`RolesGuard`** + **`@Roles(...)`** — metadata-driven role
  enforcement via `Reflector`.
- **`@Auth(...roles)`** (`src/auth/decorators/auth.decorator.ts`) —
  the convenience decorator combining all three guards; used by every
  business endpoint in this phase.
- **`LoanApplicationsService`** — `submit` (create as `SUBMITTED`),
  `findAllForUser` (role-scoped), `findOneForUser` (ownership-checked
  for customers), `review` (the approve/reject state machine).
- **`LoanApplicationRepository`**, **`LoanRepository`** — concrete
  repositories extending `BaseRepository<T>`; `LoanRepository` also
  generates loan numbers (`LN-<year>-<random6>`, relying on the
  `uq_loans_loan_number` DB constraint from Phase 3 as the actual
  uniqueness guarantee).
- **`CustomersService`** — `getOwnProfile`/`upsertOwnProfile` (find-or-create
  semantics, same pattern as `AuthService`), `listCustomers`/`getCustomerById`
  (role-filtered via `UserRepository.findAllByRole`).
- Both modules' controllers are deliberately thin — all logic lives in
  the service layer, controllers only translate HTTP ↔ service calls
  and DTOs ↔ entities.

### Customer App (`lib/features/loans/`, `lib/features/profile/`)

`LoanApplicationFormScreen` submits and surfaces backend validation
errors as-is. `MyApplicationsScreen`/`ApplicationDetailScreen` are
read-only views. `ProfileScreen` is a flat form over every
`CustomerProfile` field (no document upload yet — see follow-up work).
`HomeScreen` is now a navigation hub to these features.

### Employee App (`lib/features/crm/`, `lib/features/loans/`)

`CustomerListScreen`/`CustomerDetailScreen` are read-only CRM views.
`ApplicationReviewQueueScreen`/`ApplicationReviewDetailScreen`
implement the review workflow's UI — approve requires an interest
rate input; both actions just call the backend and reload.

### Known follow-up work (Phase 5)

- **No pagination or search** on the customer list or application
  queue — fine at current expected scale, will need revisiting.
- **No document upload** tying `DocumentEntity` to Firebase Storage —
  profile/application forms are text-only for now.
- **No notifications** (FCM) when an application is decided — the
  customer has to check the app.
- **This migration set hasn't been run against a real database
  either** — same caveat as Phase 3/4; verify all three together:
  `1783767718032-InitialSchema.ts`,
  `1783769475535-AlterUsersRelaxRequiredProfileFields.ts`, and any
  future ones, in order.
- **No admin-invite/provisioning flow still** (flagged in Phase 4) —
  employee/admin accounts remain manually inserted.

## Phase boundaries (Phase 5)

Phase 5 deliberately stopped at CRM + the loan-application workflow.

## Phase 6 — Customer App Production Experience

Phase 6 was scoped to the Flutter Customer App **only** — the
Employee App and Admin Panel were not touched. Two real conflicts
between the phase's own requirements had to be resolved deliberately
rather than silently picking a side; both are documented in full below.

### Conflict 1 — Riverpod vs. the existing GetIt DI

Phases 2-5 use GetIt as the service locator for repositories and
`AuthController`. The Phase 6 brief required both "use Riverpod" and
"use the existing AuthService/repositories" and "no duplicated code" —
literally rewriting the DI layer for Riverpod would satisfy the first
requirement while violating the other two.

**Resolution:** `core/riverpod/providers.dart` defines Riverpod
providers that simply return the _same_ GetIt singleton
(`Provider<ApiClient>((ref) => getIt<ApiClient>())`, etc.) rather than
constructing new instances. Riverpod becomes the reactive
UI-consumption layer (new screens/controllers use
`ConsumerWidget`/`StateNotifier`/`AsyncNotifier`); GetIt remains the
single source of truth for _construction_. There is exactly one
`ApiClient`, one `AuthController`, etc., regardless of which layer
reads them.

### Conflict 2 — Screens needing backend support that didn't exist

Documents, Notifications, Support tickets, Consent/Privacy, and
Account Deletion are all required screens, but "no new backend modules
unless absolutely required" was also a stated constraint, and none of
that backend surface existed before this phase.

**Resolution, screen by screen:**

- **Documents** — genuinely new `DocumentsModule`, justified because
  `DocumentEntity` already existed (built in Phase 3 for exactly this
  purpose) and was otherwise unused. Real file storage via a
  `StorageService` interface, with `LocalDiskStorageService` as the
  only implementation (writes to `UPLOADS_DIR`) — a working default,
  not a stub, since there's no live Firebase Storage bucket in this
  environment to integrate against. A `FirebaseStorageService`
  implementing the same interface is a clean future swap.
- **Notifications** — a small, genuinely new `NotificationsModule`
  (one entity, one migration), populated by a real hook into the
  _existing_ `LoanApplicationsService.review()` — approving/rejecting
  an application creates a real notification row, not a canned one.
- **Consent / Privacy / Account deletion** — additive fields on the
  _existing_ `CustomerProfileEntity` (`marketingConsent`,
  `dataConsentAcceptedAt`) and `UserEntity` (`deletionRequestedAt`),
  exposed via new endpoints on the _existing_ `CustomersController` —
  not new modules. Account deletion is a request only (audit-logged via
  the existing `AuditLogEntity`) — no automated hard-delete job reads
  it, since immediately deleting a financial/loan customer record
  without safeguards would be inappropriate.
- **Support tickets** — implemented as a real `mailto:` composer
  (`url_launcher`) opening the device's own email client, pre-filled
  with the customer's message. This was a deliberate choice over
  building a full ticketing backend: it's genuinely functional (not a
  fake "ticket submitted" screen with nowhere for it to go) without
  the scope of a new persistence layer, queueing, or staff-facing
  ticket UI that a real ticketing system would need.

### Backend additions (`apps/backend/src/`)

- **`storage/`** — `StorageService` (abstract) + `LocalDiskStorageService`,
  `@Global()` module (mirrors `FirebaseAdminModule`'s pattern).
- **`documents/`** — `DocumentRepository`, business constants
  (required types, 10MB upload limit), `DocumentsService` (list with
  required-status cross-reference, upload-or-replace, ownership-checked
  content streaming), `DocumentsController` (`GET/POST /v1/documents`,
  `GET /v1/documents/:id/content`, using `@nestjs/platform-express`'s
  `FileInterceptor`).
- **`notifications/`** — `NotificationEntity` + migration,
  `NotificationRepository`, `NotificationsService` (list, mark-read,
  and `createForUser` — an internal helper other services call),
  `NotificationsController` (`GET /v1/notifications`,
  `PATCH /v1/notifications/:id/read`). `LoanApplicationsService.review`
  now calls `createForUser` on both approve and reject.
- **Migration `AddConsentAndDeletionRequestFields`** — additive, not an
  edit to any prior migration (same pattern established in Phase 4's
  schema correction): adds `customer_profiles.marketing_consent`,
  `customer_profiles.data_consent_accepted_at`, and
  `users.deletion_requested_at`.
- **`CustomersController`** gains `POST /v1/customers/me/deletion-request`;
  `UpdateCustomerProfileDto` gains `marketingConsent`/`acceptDataConsent`
  (the latter is one-way — it can only set the acceptance timestamp,
  never clear it).

### Customer App structure

The app keeps the **flat `lib/features/<feature>/` organization**
established since Phase 4 — this already satisfies "feature-first
structure." A deeper `data/domain/presentation` split per feature was
deliberately not introduced: the data layer (repositories in
`core/network/`, models in `core/models/`) was already centralized and
working across Phases 2-5, and nesting it per-feature now would be
churn without a functional benefit proportionate to this app's actual
complexity. New Phase 6 code follows the same flat convention as the
Phase 4-5 code it sits alongside.

```
lib/
├── core/
│   ├── app.dart, router/, di/, firebase/, config/     (unchanged in kind)
│   ├── riverpod/providers.dart                         (NEW — GetIt bridge)
│   ├── widgets/                                        (NEW — AppCard, PrimaryButton, LoadingView, ErrorView, EmptyView, StatusBadge)
│   ├── utils/formatters.dart                           (NEW — currency/date, no `intl` dependency)
│   ├── bootstrap/app_bootstrap_state.dart               (NEW — cached onboarding-seen flag)
│   ├── models/                                          (existing + document.dart, app_notification.dart, user_profile.dart)
│   └── network/                                         (existing + document_repository.dart, notification_repository.dart, user_repository.dart)
└── features/
    ├── auth/            splash, onboarding (NEW) + existing phone/OTP screens
    ├── home/             real dashboard (rewritten from the Phase 2 placeholder)
    ├── loans/            categories, details, multi-step flow, success, timeline (NEW) + existing my-applications/detail (enhanced)
    ├── documents/        (NEW — full feature)
    ├── profile/          view/edit split (from Phase 5's combined screen) + privacy/deletion (NEW)
    ├── support/          (NEW — full feature)
    └── notifications/    (NEW — full feature)
```

### Session restoration & onboarding — how they actually work

- **Session restoration** isn't new code so much as newly-_visible_
  behavior: Firebase Auth's SDK already persists sessions locally and
  `AuthController` (Phase 4) already listens to `authStateChanges()`.
  What Phase 6 adds is `SplashScreen` and a `redirect` rewrite so the
  user sees a branded loading moment while that resolves, instead of a
  flash of the wrong screen or an invisible delay.
- **Onboarding** is tracked via `shared_preferences`
  (`OnboardingRepository`), but the router's `redirect` reads a
  synchronous cached flag (`AppBootstrapState.hasSeenOnboarding`,
  loaded once in `main()` before `runApp()`) rather than hitting
  SharedPreferences on every navigation — go_router's `redirect` does
  support async callbacks, but there's no reason to pay that cost for
  a flag that changes at most once per install.

### Riverpod ↔ GetIt bridge (`core/riverpod/providers.dart`)

Every provider here wraps a GetIt singleton. `authControllerProvider`
and `customerAuthRepositoryProvider` return `null` when Firebase isn't
configured (mirroring GetIt's own conditional registration) rather
than throwing. Not every bridge provider is consumed yet — the Phase
4/5 sign-in/sign-out flows still call `getIt<T>()` directly, since
rewriting already-working auth flows wasn't a Phase 6 goal; new
screens (Home, Documents, Profile, Notifications) consume repositories
through the bridge.

### Known follow-up work (Phase 6)

- **Camera/photo-library permissions aren't declared anywhere** — see
  the "no native platform folders" gap (flagged since Phase 2): once
  `flutter create .` generates `android/`/`ios/`, add `CAMERA`/
  `READ_MEDIA_IMAGES` (Android) and `NSCameraUsageDescription`/
  `NSPhotoLibraryUsageDescription` (iOS) before `image_picker` will
  work on a real device.
- **Local-disk document storage** is real and functional but
  single-instance — a multi-instance production deployment needs a
  `FirebaseStorageService` (or S3, etc.) implementing `StorageService`.
- **No push delivery for notifications** — they're in-app/list-only;
  FCM integration (the SDK is a declared-but-unused dependency since
  Phase 2) is future work.
- **Eligibility information is static guidance, not a decision engine**
  — deliberately, since no backend eligibility logic exists; framed
  honestly in the UI rather than faking a personalized check.
- **Contact Support has no server-side record** of what was sent (it's
  a `mailto:`, sent from the user's own email client) — if ticket
  tracking/SLAs become a requirement, that's a real ticketing backend,
  not an extension of this.
- **This migration set still hasn't been run against a real database**
  — same caveat as every prior phase; verify all migrations together
  in order.

## Phase boundaries (Phase 6)

Phase 6 stopped at the Customer App. The Employee App and Admin Panel
were unchanged.

## Phase 7 — Production Readiness Audit & Hardening

Phase 7 began with a full audit of the existing repository against 10
categories, then fixed what was genuinely fixable in this environment.
Every finding below reflects an actual inspection of the repository
(reading files, grepping for patterns), not a generic checklist —
where nothing was found, that's stated too.

### 1. What already exists

Everything documented in Phases 1-6 above: monorepo tooling, dev
environment, 8 database entities + 4 migrations, Firebase auth across
3 surfaces, RBAC + loan workflow + CRM, and a fully-screened Customer
App. Verified present at audit time: clean git history (7 commits,
clean working tree), 263 tracked files, no `pnpm-lock.yaml`, no
`android`/`ios` folders, no committed `.env` files, no hardcoded
secrets (checked via pattern grep for API-key-shaped strings and
`BEGIN PRIVATE KEY` blocks — none found).

### 2. What's incomplete

- Employee App and Admin Panel have no equivalent to the Customer
  App's Phase 6 UI depth (they still have Phase 4/5-level screens) —
  by design, since Phase 6 was explicitly scoped to the Customer App only.
- Documents/Notifications have no staff-facing counterpart (employees
  can't review uploaded documents or see notification analytics).
- No admin-invite/provisioning flow (flagged since Phase 4) — employee/
  admin accounts are still manually inserted.

### 3. Technical debt

- `LoanApplicationsService.review()` does its Loan-creation and
  notification-creation as separate sequential awaits, not inside a
  single DB transaction — if the process crashes between them, an
  application could end up `APPROVED` with no corresponding `Loan`, or
  a `Loan` without a notification having fired. Worth wrapping in a
  TypeORM transaction in a future pass; not fixed here since it
  requires touching tested Phase 5 business logic and the failure
  window is narrow, not zero-risk to change blind.
- `DocumentsService`/`StorageService` has no transactional cleanup: if
  the DB write fails after the file is already saved to disk, the file
  orphans. Low-impact (local disk, not billed cloud storage) but worth
  a cleanup job eventually.

### 4. Production blockers (fixed this phase)

- **CORS misconfiguration**: `credentials: true` with `origin: '*'` —
  browsers reject this combination outright, and it was unnecessary
  since auth uses a Bearer token, never cookies. Fixed:
  `credentials: false`.
- **No rate limiting anywhere.** A public-facing fintech API with zero
  request-rate protection is a real abuse/cost risk (brute-force,
  storage exhaustion via repeated uploads). Fixed: `@nestjs/throttler`,
  global default (60 req/min) + a tighter limit (10 req/min) on
  `POST /v1/auth/session`, the endpoint hit on every sign-in.
- **Document upload accepted any file type** — only size was capped.
  Fixed: MIME-type allowlist via multer's `fileFilter` (images + PDF only).
- **Header injection risk** in the document preview endpoint — the
  stored (user-supplied) filename was interpolated directly into
  `Content-Disposition` with no sanitization. Fixed: strips `"`/CR/LF
  before use.
- **No persistent volume for uploaded documents in Docker** — every
  container recreation would silently lose all uploaded files. Fixed:
  `backend_uploads` named volume in `docker-compose.yml`.
- **CI never actually ran the migration set against a live database**
  — every phase's docs said "hasn't been run against a real database,
  verify before relying on it." Fixed: `pnpm migration:run` added as a
  real CI step in `ci-backend.yml`, against the same Postgres service
  the boot smoke test already used. This is the first point in the
  project where the migrations are continuously, automatically verified.

### 5. Play Store blockers (audited, **not** fixed — see reasoning)

- No `android/`/`ios/` native platform folders for either Flutter app
  (flagged since Phase 2). No app icons, no adaptive icon config, no
  release signing config, no `applicationId`/bundle identifier, no
  `versionCode` (native build number — distinct from `pubspec.yaml`'s
  `version:` field, which is already present and correctly formatted).
- **Why not hand-created here:** generating Gradle build files and an
  Xcode project by hand, without the actual Flutter/Gradle/Xcode
  toolchain available to verify them, is materially more likely to
  produce broken or subtly-wrong native builds than to help — these
  are exactly the files `flutter create .` generates and verifies
  correctly in one command in a real Flutter environment. That remains
  the correct next step, not something to fake here.
- Beyond code: a Play Console listing needs a privacy policy URL, a
  Data Safety form (what data is collected/shared — relevant here:
  phone number, financial application data, uploaded ID documents),
  and target API level compliance. These are Play Console
  configuration/business steps, not repository files.

### 6. Security issues (see #4 for the ones fixed; additional findings)

- No committed secrets found (grepped for API-key-shaped strings,
  `BEGIN PRIVATE KEY` blocks, and hardcoded password-like assignments
  — clean).
- `ThrottlerModule`'s default storage is in-memory — fine for a single
  instance, but rate-limit state won't be shared across replicas in a
  horizontally-scaled deployment. A Redis-backed throttler storage
  adapter would be needed before scaling beyond one backend instance.
  Noted, not implemented (no Redis in the stack yet).
- `AllExceptionsFilter` (Phase 2) already avoids leaking stack traces
  to clients and logs full context server-side — reviewed, still correct.
- Pino's header redaction (`authorization`, `cookie`) — reviewed,
  still correct and now more relevant given Bearer tokens flow through
  every authenticated request.

### 7. Missing native Android/iOS setup

Confirmed via direct filesystem check: no `android/`, `ios/`, or `web/`
directories exist under either Flutter app. This blocks `flutter run`/
`flutter build apk`/`ios`/`web` and all Play Store/App Store
submission steps. Does **not** block `flutter analyze`/`flutter test`/
`flutter pub get`, which is why CI (Phase 1) still works without them.

### 8. Missing Firebase configuration

`FIREBASE_ENABLED` still defaults to `false` everywhere (backend, both
Flutter apps, admin panel) — this is intentional graceful degradation
established in Phase 2, not a bug. What's genuinely missing (expected,
since no real Firebase project has been provided to this environment):
actual `FIREBASE_ADMIN_*` credentials, actual `VITE_FIREBASE_*`/
Flutter Firebase client config values, and the `firebase_options.dart`
files FlutterFire CLI would generate per-app. Once a real Firebase
project exists, populate the env vars documented in each `.env.example`
and flip the enabled flags.

### 9. Missing CI/CD pieces

- Migration verification: **fixed this phase** (see #4).
- Still missing: any **CD** (continuous deployment) — CI only lints/
  builds/tests/verifies; nothing deploys anywhere automatically. No
  Fastlane/Play Store release automation (blocked on native folders
  existing first, see #5). No committed `pnpm-lock.yaml` — CI still
  runs `pnpm install --no-frozen-lockfile`, meaning dependency versions
  can drift between CI runs rather than being pinned; generate and
  commit one the moment network access is available, then tighten CI
  back to `--frozen-lockfile`.

### 10. Verification actually performed this phase (and what wasn't)

- **Performed**: TS syntax check (`ts.transpileModule`) on all 74
  backend files — pass. JSON/YAML parse validation on every changed
  file — pass. Direct filesystem greps confirming each audit finding
  above (not asserted from memory).
- **Not performed, and why**: no `flutter analyze`/`dart format`/
  `flutter test`, no `pnpm install`/`tsc --noEmit` with real installed
  types, no actual Docker build, no actual migration run against a
  live Postgres — this sandbox has no Flutter SDK, no network access
  to npm/pub registries, and no running Postgres instance. The new CI
  step (#4) is what will perform the real migration verification, the
  moment this is pushed.

## Phase boundaries (Phase 7)

Phase 7 stopped at audit + backend/infra fixes. Native platform setup
and CD remained open.

## Phase 8 — Production Hardening & Release Path

Phase 8 closed the remaining gaps that are genuinely fixable and
verifiable inside the repository, and turned the toolchain-dependent
blockers into an exact runbook rather than hand-written (and
unverifiable) files.

### Atomic loan-review decisions

`LoanApplicationsService.review()` previously performed the decision as
several independent writes with no atomicity. On approval that was three
writes — insert `Loan`, update the application to `APPROVED`, insert the
notification — any of which could fail after an earlier one succeeded,
leaving inconsistent state (an `APPROVED` application with no `Loan`, or
a `Loan` whose application is still `SUBMITTED`). For a fintech ledger
this is the single highest-value correctness fix available.

**Design decision:** rather than change `BaseRepository` or the concrete
repositories (which would ripple across the codebase and risk the
working architecture), the fix injects the default TypeORM `DataSource`
into the _service_ and wraps only the decision path in
`dataSource.transaction(async (manager) => { ... })`. All mutations use
the transactional `manager`; a throw anywhere rolls the whole decision
back. The pre-transaction reads and the `ConflictException` guards stay
outside the transaction (they don't mutate). This keeps the
repository-pattern intact — the repositories are untouched — while
making the one multi-write operation atomic.

`NotificationsService.createForUser` gained an optional `EntityManager`
parameter. When the review transaction passes its `manager`, the
notification insert joins that transaction; otherwise the service falls
back to its own repository. This keeps notification-creation logic in
one place (no duplicated insert in the caller) _and_ makes it
transaction-aware — the better production design than inlining the
insert at the call site.

### Fail-safe Firebase bootstrap

Both apps' `initializeFirebase` now distinguish three states rather than
two: disabled (no-op, as before), enabled-but-unconfigured (empty
placeholder options → log an actionable error and skip), and
enabled-and-configured (initialize normally). Previously the middle
state would call `Firebase.initializeApp` with blank credentials and
fail with an opaque platform exception. The check is a simple
`apiKey/appId/projectId .isNotEmpty` guard — the placeholder ships empty,
a real FlutterFire config never is.

### CD/release pipeline

`.github/workflows/cd-customer-app.yml` builds a signed release `.aab`
and can publish to Play's internal track. Two deliberate design choices:
it triggers only on a version tag or manual dispatch (releasing is an
intentional act, not a push side effect), and a `guard-native-setup`
job fails fast with an actionable message if `apps/customer-app/android`
doesn't exist yet. That guard is what makes it safe to commit the
workflow _now_, before the native folders are generated — it explains
itself instead of failing cryptically.

### Why native folders / Firebase config are a runbook, not code

`flutter create` generates Gradle wrappers, `local.properties`, native
runners, and build files pinned to the local SDK/Gradle versions;
`flutterfire configure` generates credentials from a real Firebase
project. Neither can be produced or verified without the respective
toolchain, and hand-writing them would yield a build that looks complete
but breaks on the first real `flutter build`. `docs/native-setup.md`
captures every command instead — real, ordered, and runnable by the
maintainer, with the CD workflow already wired to activate once those
steps are done.

### Verification performed (Phase 8)

TypeScript transpile-syntax check across all 74 backend files; Dart
brace/paren balance across all 90 Dart files; YAML validity for the new
CD workflow and all others; JSON validity across the repo; manual
review of the TypeORM `DataSource`/`EntityManager` API usage against the
0.3.x signatures (`transaction`, `manager.create(Entity, data)`,
`manager.save`, `manager.update(Entity, id, partial)`) and confirmation
that `@nestjs/typeorm` (`InjectDataSource`) + `typeorm` are already
dependencies and the default `DataSource` is globally injectable via the
existing `DatabaseModule`. **Not verifiable here** (no Flutter/Dart/pnpm
SDK, no network, no live Postgres): `flutter analyze`/`dart format`/
`flutter test`, real `tsc` type-checking, actual transaction rollback
behavior against a database, and the CD workflow's build steps. The
repo's own CI runs the Flutter and backend checks on push.

## Phase boundaries

Phase 8 stops at in-repo hardening + the release runbook/CD scaffolding.
Actually running the native-setup runbook, backend deployment, and the
Phase 9 candidates (admin provisioning, Firebase Storage, FCM) remain
open — see the README's Roadmap section.
