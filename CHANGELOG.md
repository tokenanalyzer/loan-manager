# Changelog

All notable changes to this project are documented in this file.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Phase 8] — Production Hardening & Release Path

Continued the production-readiness work from Phase 7, focused on the
last gaps that are genuinely fixable and verifiable inside the repo,
plus an exact runbook for the toolchain-dependent Play Store steps.

### Changed

- **`LoanApplicationsService.review()` is now transactional.** The
  approve path (create `Loan` → mark application `APPROVED` → create
  notification) and the reject path (mark `REJECTED` → create
  notification) each run inside a single `DataSource.transaction()`.
  Previously these were separate, un-atomic writes — a failure between
  them could leave an approved application with no loan row, or a loan
  with the application still `SUBMITTED`. Existing repositories are
  unchanged; only this orchestration method was wrapped, preserving the
  repository-pattern architecture.
- **`NotificationsService.createForUser` accepts an optional
  `EntityManager`**, so notification creation joins the caller's
  transaction instead of duplicating insert logic in the caller.
- **Firebase bootstrap fails safe** in both Flutter apps: when
  `FIREBASE_ENABLED=true` but the options are still empty placeholders,
  it logs a clear, actionable error and skips initialization rather than
  crashing opaquely on `Firebase.initializeApp` with blank credentials.

### Added

- **`.github/workflows/cd-customer-app.yml`** — CD/release pipeline:
  builds a signed release App Bundle for the Customer App and can
  optionally upload to Play's internal testing track. Guarded to fail
  fast (with an actionable message) until native setup exists, so it is
  safe to commit before the native folders are generated.
- **`docs/native-setup.md`** — the exact, ordered runbook for the
  production steps that require the Flutter toolchain, a real Firebase
  project, and signing keys (native folder generation, permissions,
  `flutterfire configure`, keystore, `.gitignore` hardening, CI secrets,
  Play Console listing requirements).

### Explicitly not done here (documented, not faked — Phase 9)

Native `android`/`ios` folders (`flutter create`), real Firebase config
(`flutterfire configure`), signing keys, and committed lockfiles — all
require the Flutter SDK / a real Firebase project / network, none of
which exist in the build environment. Hand-writing them would produce a
broken build that only looks complete. They are captured as an exact
runbook in `docs/native-setup.md` instead.

## [Phase 7] — Production Readiness Audit & Hardening

Began with a full repository audit (10 categories — see
`docs/architecture.md` for the complete findings). Fixed what was
genuinely fixable in this environment; explicitly did not fake-fix
what wasn't (native platform folders, a lockfile, a live-database
migration run outside CI).

### Fixed

- **CORS**: removed `credentials: true` with `origin: '*'` (an invalid
  combination browsers reject, and unnecessary since auth uses Bearer
  tokens, not cookies) → `credentials: false`.
- **Rate limiting**: added `@nestjs/throttler` — global 60 req/min
  default via a global `APP_GUARD`, plus a tighter 10 req/min limit on
  `POST /v1/auth/session`.
- **Document upload**: added a MIME-type allowlist (`fileFilter`) —
  previously any file type was accepted, only size was capped.
- **Document preview**: sanitized the stored filename before use in
  `Content-Disposition` (removed `"`/CR/LF) — closes a header-injection
  gap.
- **Docker**: added a `backend_uploads` named volume so uploaded
  documents survive container recreation; added `uploads` to the
  backend's `.dockerignore`.
- **CI**: added a real `pnpm migration:run` step in `ci-backend.yml`
  against the live Postgres service — the first continuous,
  automated verification that the full migration set actually applies
  cleanly, closing a caveat repeated since Phase 3.

### Audited, not changed (see architecture.md for full reasoning)

- Native `android`/`ios` platform folders — deliberately not
  hand-created; `flutter create .` in a real Flutter environment is
  the correct, safe way to generate these.
- `pnpm-lock.yaml` — still not committed (no network access in this
  environment).
- `LoanApplicationsService.review()`'s Loan-creation + notification
  sequence isn't wrapped in a DB transaction — flagged as technical
  debt, not fixed (touches tested Phase 5 logic; narrow failure window).
- `ThrottlerModule`'s in-memory storage won't share state across
  horizontally-scaled replicas — flagged for when that becomes relevant.

## [Phase 6] — Customer App Production Experience

Scoped to the Flutter Customer App only — Employee App and Admin Panel
untouched.

### Added — Backend

- `StorageModule`/`StorageService` (abstract) + `LocalDiskStorageService`
  — a real, working file storage default (`UPLOADS_DIR`), swappable
  for Firebase Storage later behind the same interface.
- `DocumentsModule`: `DocumentRepository`, required-document-type
  constants, `DocumentsService` (list-with-status, upload-or-replace,
  ownership-checked streaming), `DocumentsController`
  (`GET/POST /v1/documents`, `GET /v1/documents/:id/content`).
- `NotificationsModule`: `NotificationEntity` + migration,
  `NotificationRepository`, `NotificationsService` (list, mark-read,
  `createForUser`), `NotificationsController`. Wired into
  `LoanApplicationsService.review()` — approve/reject now creates a
  real notification.
- Additive migration `AddConsentAndDeletionRequestFields`: adds
  `customer_profiles.marketing_consent`/`data_consent_accepted_at` and
  `users.deletion_requested_at`. `CustomersController` gains
  `POST /v1/customers/me/deletion-request` (audit-logged, request-only
  — no automated hard delete).
- `@types/multer` devDependency for typed file uploads.

### Added — Customer App

- **Auth**: `SplashScreen` (session restoration), `OnboardingScreen`
  (shown once via `shared_preferences`), router `redirect` rewritten
  to gate both alongside the existing login flow.
- **Home**: real dashboard (`HomeController`, Riverpod `AsyncNotifier`)
  — greeting, active applications, loan category quick-links, quick
  actions, notifications summary.
- **Loans**: category selection, details/eligibility (static,
  honestly-framed guidance), multi-step application flow
  (`LoanApplicationFlowController`), success screen, `StatusTimeline`
  on application detail.
- **Documents**: full feature — required-list, camera/gallery upload
  (`image_picker`) with progress, replace, preview.
- **Profile**: split into View/Edit; new Privacy Settings (consent
  toggles) and Account Deletion Request screens.
- **Support**: Help Center, static FAQ, Contact Support (real
  `mailto:` via `url_launcher`).
- **Notifications**: list with read/unread state and deep linking into
  applications.
- **Shared infrastructure**: `core/riverpod/providers.dart` (GetIt
  bridge), `core/widgets/` (`AppCard`, `PrimaryButton`, `LoadingView`,
  `ErrorView`, `EmptyView`, `StatusBadge`), `core/utils/formatters.dart`,
  `ApiClient.uploadFile` (multipart, added to the shared Flutter package).
- New dependencies: `flutter_riverpod`, `shared_preferences`,
  `image_picker`, `url_launcher`.

### Resolved conflicts (documented in `docs/architecture.md`)

1. Riverpod (required) vs. existing GetIt DI (must not duplicate) →
   Riverpod providers wrap GetIt singletons rather than re-registering them.
2. Screens needing non-existent backend support vs. "no new modules
   unless required" → small, justified additions per screen (see above)
   instead of fake buttons.

### Explicitly not implemented (by design — Phase 7+)

Admin-invite/provisioning flow, Firebase Storage swap-in, push
notification delivery (FCM), native `android`/`ios` platform folders
(and the camera/photo permissions that depend on them).

## [Phase 5] — CRM & Loan-Form Business Logic

### Added

- **Backend RBAC**: `SyncUserGuard` (attaches the synced `UserEntity`
  as `request.appUser`), `RolesGuard` + `@Roles(...)`, the convenience
  `@Auth(...roles)` decorator (composes `FirebaseAuthGuard` →
  `SyncUserGuard` → `RolesGuard`), `@CurrentAppUser()`.
  `AuthController` refactored to use this pattern (removed duplicate
  sync logic from Phase 4).
- **LoanApplicationsModule**: `LoanApplicationRepository`,
  `LoanRepository` (loan number generation), business-rule constants
  (amount $500–$50,000, term 3–60 months),
  `CreateLoanApplicationDto`/`ReviewLoanApplicationDto`/`LoanApplicationResponseDto`,
  `LoanApplicationsService` (submit, role-scoped list, ownership-checked
  get, the approve/reject state machine — approval creates a real
  `Loan`), `LoanApplicationsController` (`POST/GET /v1/loan-applications`,
  `GET /v1/loan-applications/:id`, `PATCH /v1/loan-applications/:id/review`).
- **CustomersModule** (CRM): `CustomerProfileRepository`,
  `UpdateCustomerProfileDto`/`CustomerProfileResponseDto`/`CustomerSummaryResponseDto`,
  `CustomersService` (self-service profile find-or-create + role-filtered
  customer lookup via `UserRepository.findAllByRole`),
  `CustomersController` (`GET`/`PATCH /v1/customers/me`,
  `GET /v1/customers`, `GET /v1/customers/:id`, `GET /v1/customers/:id/profile`).
- **Customer App**: loan application models + repositories
  (`LoanApplicationRepository`, `CustomerProfileRepository`),
  `LoanApplicationFormScreen`, `MyApplicationsScreen`,
  `ApplicationDetailScreen`, `ProfileScreen`; `HomeScreen` is now a
  navigation hub.
- **Employee App**: CRM + review models/repositories
  (`LoanApplicationRepository`, `CustomerRepository`),
  `CustomerListScreen`, `CustomerDetailScreen`,
  `ApplicationReviewQueueScreen`, `ApplicationReviewDetailScreen`;
  `HomeScreen` is now a navigation hub.

### Explicitly not implemented (by design — Phase 6+)

Pagination/search, document upload (Firebase Storage), notifications
(FCM), payments/disbursement workflow, admin panel features, and an
admin-invite/provisioning flow for employee/admin accounts.

## [Phase 4] — Firebase Authentication (Login/OTP)

### Added

- **Backend**: `FirebaseAuthGuard` (verifies Firebase ID tokens, 503 if
  Firebase Admin isn't configured), `@CurrentUser()` decorator,
  `AuthService.syncFromFirebaseToken` (find-or-create; always creates
  first-time sign-ins as `UserRole.CUSTOMER` — never lets a client
  self-assign a role), `UserRepository` (first concrete repo extending
  `BaseRepository<T>`), `AuthController` (`POST /v1/auth/session`,
  `GET /v1/auth/me`), `AuthModule`/`UsersModule` wired into `AppModule`.
- **Shared Flutter**: `AuthState` (sealed class), `AuthController`
  (reacts to `FirebaseAuth.authStateChanges()`, syncs the backend
  session), `ApiClient.setAuthTokenProvider`/`clearAuthTokenProvider`
  (fresh token per request).
- **Customer App**: `CustomerAuthRepository` (phone/OTP),
  `PhoneEntryScreen`, `OtpVerificationScreen`, auth-aware router
  redirect, sign-out action on `HomeScreen`.
- **Employee App**: `EmployeeAuthRepository` (email/password + reset),
  `LoginScreen`, auth-aware router redirect, sign-out action.
- **Admin Panel**: Firebase JS SDK (guarded init in `core/firebase.ts`),
  `AuthProvider`/`useAuth()`, `LoginPage`, `ProtectedRoute`, real
  bearer-token attachment in `api-client.ts` (previously a placeholder).
- **Migration**: `1783769475535-AlterUsersRelaxRequiredProfileFields.ts`
  — relaxes `users.email`/`users.full_name` to nullable (additive, not
  an edit to the Phase 3 migration) to support phone-only sign-up.
  `UserEntity` and `UserProfileResponseDto` updated to match.

### Explicitly not implemented (by design — Phase 5+)

Admin-invite/seeding flow for employee/admin accounts, OTP rate-limiting,
profile-completion UI, CRM/loan-form business logic, general-purpose
API endpoints, and admin panel features.

## [Phase 3] — Database Schema & Migrations

### Added

- Eight TypeORM entities in `apps/backend/src/database/entities/`:
  `UserEntity`, `CustomerProfileEntity`, `EmployeeProfileEntity`,
  `LoanApplicationEntity`, `LoanEntity`, `PaymentEntity`,
  `DocumentEntity`, `AuditLogEntity`, all extending a shared
  `AbstractEntity` (UUID PK, timestamps, soft delete) except the
  append-only `AuditLogEntity`.
- Shared enums (`UserRole`, `LoanApplicationStatus`, `LoanStatus`,
  `PaymentStatus`, `DocumentType`) backing native Postgres enum columns.
- `typeorm-naming-strategies`' `SnakeNamingStrategy`, applied
  identically in `database.module.ts` and `data-source.ts`.
- Explicit names on every `@Index`/`@Unique`/`@JoinColumn` (foreign
  key constraint names included) so they match the migration exactly.
- Hand-written initial migration
  (`1783767718032-InitialSchema.ts`) creating every table, enum type,
  constraint, and index — **not CLI-generated**; no live database or
  network access was available to run `typeorm migration:generate`.
  Verify by running it against a real Postgres instance before relying
  on it in any environment.
- `database.module.ts` now registers all entities (previously `[]`)
  and applies the naming strategy; `data-source.ts` updated to match.

### Explicitly not implemented (by design — Phase 4+)

Concrete repositories per entity, API endpoints/controllers, Firebase
Authentication (login/OTP), CRM/loan-form business logic, admin
features, and application UI beyond the Phase 2 placeholder screens.

## [Phase 2] — Core Development Environment

### Added

- **Backend**: typed/validated environment config (Joi), PostgreSQL
  connection module (TypeORM, zero entities), standalone TypeORM
  `DataSource` for future migrations, structured Pino logger with
  request correlation + redaction, global exception filter, guarded
  Firebase Admin provider, generic `BaseRepository<T>`, Helmet/CORS/
  validation/versioning/graceful-shutdown server config.
- **Admin Panel**: typed env wrapper, Axios-based API client with
  interceptors, `react-router-dom` routing with a placeholder status page.
- **Flutter apps** (Customer + Employee): compile-time environment
  config (`--dart-define-from-file`), manual `GetIt` dependency
  injection, `go_router` routing, guarded Firebase placeholder
  bootstrap, minimal placeholder home screen, widget smoke test.
- **Shared Flutter package**: `AppTheme`/`AppColors`/`AppTextStyles`
  (light + dark, Material 3), Dio-based `ApiClient`, sealed-class
  `ApiResult<T>`, `NetworkException`, `BaseRepository`, shared
  `AppLogger`, shared `EnvKeys` constants.
- **Shared types package**: generic `ApiResponse<T>`/`ApiErrorResponse`/
  `PaginatedResult<T>` structural types.
- Dev/build scripts: flavor-aware Melos run/build scripts, root `start`
  script + Turborepo task, backend migration script stubs.
- Docs: this changelog, updated README and `docs/architecture.md`.

### Fixed

- CI: removed `--frozen-lockfile` (no `pnpm-lock.yaml` is committed
  yet) and `cache: pnpm` in `actions/setup-node` (fails without a
  lockfile to hash) from `ci-backend.yml`, `ci-admin-panel.yml`, and
  both Dockerfiles.
- CI: added a Postgres service container and a real boot smoke-test
  step to `ci-backend.yml` that starts the built server and verifies
  the process stays alive.

### Explicitly not implemented (by design — Phase 3+)

Login/OTP, CRM features, loan forms, admin features, business logic,
database models/schema, API endpoints, and application screens beyond
the minimum needed to verify each app runs.

## [Phase 1] — Repository Foundation

Initial monorepo scaffolding: directory structure, pnpm/Turborepo/Melos
config, shared packages (`shared-types`, `shared-flutter`,
`shared-config`), multi-stage Dockerfiles, GitHub Actions CI workflows,
root config files, developer tooling, and documentation.
