# Loan Manager Enterprise

Enterprise monorepo for the Loan Manager platform: two Flutter client
apps, a NestJS backend, and a React admin panel, sharing common
tooling and infrastructure.

> **Status: Phase 8 — Production Hardening & Release Path.**
> Phases 1-6 built the foundation through a complete Customer App;
> Phase 7 audited and hardened the backend/infra. Phase 8 closes the
> last verifiable-in-repo gaps: the loan-review decision path now runs
> in a single **database transaction** (no more half-applied
> approvals), the Firebase bootstrap **fails safe** when enabled but
> unconfigured (instead of an opaque crash), and a real **CD/release
> workflow** for the Customer App ships alongside an exact
> **native-setup runbook** (`docs/native-setup.md`).
> **The toolchain-dependent Play Store blockers** (native
> `android`/`ios` folders via `flutter create`, real Firebase config
> via `flutterfire configure`, signing keys) **are documented as an
> exact runbook rather than hand-written**, because they cannot be
> generated or verified without the Flutter SDK and your Firebase
> project — see `docs/native-setup.md`.

## Tech stack

| Layer              | Technology                           |
| ------------------ | ------------------------------------ |
| Customer app       | Flutter                              |
| Employee app       | Flutter                              |
| Backend            | NestJS (Node.js / TypeScript)        |
| Admin panel        | React + Vite (TypeScript)            |
| Database           | PostgreSQL                           |
| Authentication     | Firebase Authentication _(planned)_  |
| File storage       | Firebase Storage _(planned)_         |
| Push notifications | Firebase Cloud Messaging _(planned)_ |

## Repository structure

```
loan-manager/
├── apps/
│   ├── backend/          NestJS API service
│   ├── admin-panel/      React + Vite admin web app
│   ├── customer-app/     Flutter customer application
│   └── employee-app/     Flutter employee application
├── packages/
│   ├── shared-types/     Shared TypeScript types (backend <-> admin panel)
│   ├── shared-flutter/   Shared Dart code (customer app <-> employee app)
│   └── shared-config/    Shared ESLint/Prettier configuration
├── infra/
│   └── docker/           Docker Compose stack (Postgres, backend, admin panel)
├── docs/                 Architecture and process documentation
├── scripts/              Developer tooling scripts
└── .github/workflows/    CI pipelines
```

See [`docs/architecture.md`](./docs/architecture.md) for details.

## What Phase 2 added

| Area               | Backend (NestJS)                                                                | Admin Panel (React)                       | Flutter apps                                          |
| ------------------ | ------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| Server config      | Helmet, CORS, global `ValidationPipe`, URI versioning, graceful shutdown        | Vite dev server config                    | Guarded Firebase bootstrap                            |
| Config             | Typed `ConfigService` namespaces + Joi validation (fails fast on boot)          | Typed `import.meta.env` wrapper           | Compile-time `--dart-define-from-file` (`env/*.json`) |
| Logging            | Structured Pino logger, request-correlated, header-redacted                     | Lightweight console logger wrapper        | Shared `AppLogger` (in `shared_flutter`)              |
| Error handling     | Global `AllExceptionsFilter` → consistent JSON error shape                      | Axios response interceptor                | `NetworkException` + `ApiResult<T>` sealed class      |
| Database           | `DatabaseModule` (TypeORM connection only, zero entities, `synchronize: false`) | —                                         | —                                                     |
| API client         | —                                                                               | Axios instance w/ interceptors            | Shared `ApiClient` (Dio-based)                        |
| Repository pattern | Generic `BaseRepository<T>` (no concrete entities yet)                          | —                                         | Shared `BaseRepository` (in `shared_flutter`)         |
| DI                 | Nest's built-in DI                                                              | —                                         | Manual `GetIt` setup (no codegen required)            |
| Routing            | — (no controllers yet — no APIs in scope)                                       | `react-router-dom`, one placeholder route | `go_router`, one placeholder route                    |
| Theme              | —                                                                               | —                                         | Shared `AppTheme` (light/dark, in `shared_flutter`)   |

Run the local dev environment with:

```bash
make docker-up                 # Postgres (+ backend/admin-panel containers)
pnpm dev                       # backend (watch) + admin panel (Vite)
melos run run:customer:dev     # Customer App, local dev config
melos run run:employee:dev     # Employee App, local dev config
```

**Known follow-up work** (see [`docs/architecture.md`](./docs/architecture.md)):

- No native `android/`/`ios/`/`web/` platform folders exist yet for either
  Flutter app — run `flutter create .` inside each app once to generate
  them before attempting `flutter build apk`/`ios`/`web`. `flutter analyze`,
  `flutter test`, and `flutter pub get` do not require these folders.
  **As of Phase 6, this also means camera/photo-library permission
  entries** (Android `CAMERA`/`READ_MEDIA_IMAGES`, iOS
  `NSCameraUsageDescription`/`NSPhotoLibraryUsageDescription`) **aren't
  present yet either** — add them to the generated manifests before
  `image_picker` will work on a real device.
- No `pnpm-lock.yaml` is committed yet — run `pnpm install` once (with
  network access) and commit the generated lockfile, then CI can be
  tightened back to `--frozen-lockfile` for fully reproducible installs.

## What Phase 3 added

Eight TypeORM entities modeling the loan domain, plus one hand-written
initial migration (see the caveat below) that creates every table:

| Entity                  | Table               | Purpose                                                                                  |
| ----------------------- | ------------------- | ---------------------------------------------------------------------------------------- |
| `UserEntity`            | `users`             | Shared identity for customers/employees/admins, keyed to Firebase Auth via `firebaseUid` |
| `CustomerProfileEntity` | `customer_profiles` | Customer-only fields (1:1 with `users`)                                                  |
| `EmployeeProfileEntity` | `employee_profiles` | Employee-only fields (1:1 with `users`)                                                  |
| `LoanApplicationEntity` | `loan_applications` | A request for a loan, prior to approval                                                  |
| `LoanEntity`            | `loans`             | An approved/active loan                                                                  |
| `PaymentEntity`         | `payments`          | Scheduled/made repayments against a loan                                                 |
| `DocumentEntity`        | `documents`         | Metadata for files in Firebase Storage                                                   |
| `AuditLogEntity`        | `audit_logs`        | Generic, append-only audit trail                                                         |

- All entities extend a shared `AbstractEntity` (UUID PK, timestamps,
  soft delete) except `AuditLogEntity`, which is append-only.
- A snake_case naming strategy (`typeorm-naming-strategies`) keeps DB
  columns (`firebase_uid`) aligned with TS properties (`firebaseUid`)
  automatically, in both the runtime connection and the CLI DataSource.
- `synchronize` stays `false` — schema changes are owned entirely by
  migrations, never by TypeORM auto-sync.

**Important caveat:** the initial migration (`1783767718032-InitialSchema.ts`)
was **hand-written**, not generated by `typeorm migration:generate` — this
environment has no live Postgres connection or network access to run
that command, which needs to diff entity metadata against a real
database. It was written to match every entity field-for-field, but
**run it against a real database and verify before relying on it**:

```bash
docker compose -f infra/docker/docker-compose.yml up -d postgres
cd apps/backend
pnpm migration:run
```

## What Phase 4 added

Real, working login — verified end-to-end through the whole stack:

| Surface          | Method             | What was built                                                                                                                                                                                                                                                                       |
| ---------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend          | Token verification | `FirebaseAuthGuard` (verifies Firebase ID tokens), `@CurrentUser()` decorator, `POST /v1/auth/session` + `GET /v1/auth/me`, `AuthService` (find-or-create — **never** lets a client self-assign a role), `UserRepository` (first concrete repo extending Phase 2's `BaseRepository`) |
| Customer App     | Phone + OTP        | `CustomerAuthRepository` (wraps `verifyPhoneNumber`/`signInWithCredential`), `PhoneEntryScreen`, `OtpVerificationScreen`                                                                                                                                                             |
| Employee App     | Email + password   | `EmployeeAuthRepository`, `LoginScreen` (sign-in + password reset; no self-service sign-up)                                                                                                                                                                                          |
| Admin Panel      | Email + password   | Firebase JS SDK, `AuthProvider`/`useAuth()`, `LoginPage`, `ProtectedRoute`                                                                                                                                                                                                           |
| Shared (Flutter) | —                  | `AuthState` (sealed class), `AuthController` (reacts to Firebase's auth-state stream, syncs the session) — shared by both apps                                                                                                                                                       |

**Security note:** a brand-new Firebase sign-in is always created as
`UserRole.CUSTOMER` (the lowest-privilege default). Employee/admin
accounts must already exist in the `users` table — provisioned by a
process outside this endpoint (an admin-invite flow is future work) —
so a merely-valid Firebase token can never self-elevate to an
employee/admin role.

**Schema correction:** implementing phone-only sign-up surfaced a real
conflict with Phase 3's schema (`email`/`full_name` were `NOT NULL`,
but phone auth often provides neither). Rather than editing the
already-committed Phase 3 migration, a new additive migration
(`1783769475535-AlterUsersRelaxRequiredProfileFields.ts`) relaxes both
to nullable — see `docs/architecture.md` for why.

**Firebase stays optional:** every surface still builds and runs with
`FIREBASE_ENABLED=false` (the default) — each shows a "not configured"
state instead of crashing on an uninitialized Firebase SDK, preserving
the property established in Phase 2.

## What Phase 5 added

The first real business logic in the project — role-based access
control, the loan-application workflow, and CRM:

| Area              | What was built                                                                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend RBAC      | `@Auth(...roles)` (combines `FirebaseAuthGuard` → `SyncUserGuard` → `RolesGuard`), `@CurrentAppUser()` — the synced `UserEntity`, not just the raw Firebase token                                                           |
| Loan applications | `POST /v1/loan-applications` (submit), `GET /v1/loan-applications` (role-scoped list), `GET /v1/loan-applications/:id`, `PATCH /v1/loan-applications/:id/review` (approve creates a real `Loan`; reject just closes it out) |
| CRM               | `GET`/`PATCH /v1/customers/me` (self-service profile), `GET /v1/customers` + `GET /v1/customers/:id` + `GET /v1/customers/:id/profile` (employee/admin-only lookup)                                                         |
| Customer App      | Loan application form, my-applications list/detail, profile view/edit — `HomeScreen` is now a navigation hub                                                                                                                |
| Employee App      | Customer list/detail (CRM), application review queue + approve/reject screen                                                                                                                                                |

**Business rules enforced server-side, not client-side:** requested
amount ($500–$50,000) and term (3–60 months) bounds, application
state transitions (only `submitted`/`under_review` can be decided,
enforced with a `ConflictException` otherwise), and interest rate
required for approval. Clients only surface whatever the backend
returns — no duplicate validation logic to keep in sync.

**Role scoping, not just role gating:** `GET /v1/loan-applications`
and `.../customers/:id` don't just check "is this role allowed at
all" — the service layer scopes _which rows_ come back (a customer's
own applications only; a customer's profile lookup restricted to
users who are actually customers).

## What Phase 6 added

The Customer App becomes a real, end-to-end product experience.
**Two architectural conflicts were resolved deliberately** rather than
silently picking a side — both documented in full in
`docs/architecture.md`:

1. **Riverpod vs. the existing GetIt DI.** Riverpod is now the
   reactive UI-state layer (new screens use `ConsumerWidget`/
   `StateNotifier`/`AsyncNotifier`), but every Riverpod provider in
   `core/riverpod/providers.dart` wraps the _same_ GetIt singleton —
   nothing was re-registered or duplicated.
2. **Screens needing backend support that didn't exist.** Rather than
   fake buttons, small real backend additions were made: a
   `DocumentsModule` (using the `DocumentEntity` built for exactly
   this in Phase 3, with a real — if local-disk-by-default — file
   storage layer), a `NotificationsModule` (populated by real events
   from the existing loan-review flow), and additive consent/
   deletion-request fields on the _existing_ `CustomersController` —
   no fake "ticket submitted" screens; Contact Support opens a real
   `mailto:`.

| Feature       | What was built                                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth          | `SplashScreen` (session restoration), `OnboardingScreen` (shown once, via `shared_preferences`), enhanced router `redirect` gating all of it                                                                              |
| Home          | Real dashboard: user greeting, active applications, loan category quick-links, quick actions, notifications summary — all backed by a `HomeController` (Riverpod `AsyncNotifier`)                                         |
| Loan journey  | Category selection → details/eligibility (static, honestly-framed guidance — no fake eligibility engine) → multi-step form (amount/term → purpose → review) → submit → success, driven by `LoanApplicationFlowController` |
| Applications  | `MyApplicationsScreen`, `ApplicationDetailScreen` with a real `StatusTimeline` translating backend status into customer-visible messages                                                                                  |
| Documents     | Required-documents list with missing indicators, upload via camera/gallery (`image_picker`) with live progress, replace-on-reupload, preview — backed by a genuinely new `DocumentsModule`                                |
| Profile       | Split into View / Edit (per the explicit requirement), Privacy Settings (consent toggles + data-consent acceptance), Account Deletion (a real, audit-logged _request_ — not an immediate hard delete)                     |
| Support       | Help Center, static FAQ, Contact Support (real `mailto:` composer via `url_launcher`)                                                                                                                                     |
| Notifications | List with read/unread state, deep links straight into the related loan application                                                                                                                                        |

**Structural note:** the app keeps the flat `lib/features/<feature>/`
organization established since Phase 4 (this already _is_ feature-first
structure) rather than adding extra `data/domain/presentation`
sub-nesting per feature — the data layer (repositories/models) stays
centralized under `core/`, unchanged in kind from Phases 2-5, just
with more content.

## What Phase 7 added — Production Readiness Audit & Hardening

Phase 7 began with a full audit against 10 categories (existing state,
incompleteness, technical debt, production blockers, Play Store
blockers, security issues, native setup, Firebase config, CI/CD gaps).
Full findings are in `docs/architecture.md`; the real, fixable issues
found were fixed:

| Finding                                                                                                                                       | Fix                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `credentials: true` + `origin: '*'` CORS — an invalid combination browsers reject, and unnecessary since auth uses Bearer tokens, not cookies | `credentials: false`                                                                                     |
| No rate limiting anywhere on a public-facing fintech API                                                                                      | `@nestjs/throttler`, global 60 req/min default + a tighter 10 req/min limit on `POST /v1/auth/session`   |
| Document upload accepted **any** file type, only size was limited                                                                             | MIME-type allowlist (`fileFilter`) rejecting anything but images/PDF                                     |
| Document preview interpolated the stored filename into a `Content-Disposition` header unsanitized                                             | strips quotes/CR/LF before use                                                                           |
| Uploaded documents had no persistent volume in Docker — lost on every container recreation                                                    | `backend_uploads` named volume                                                                           |
| CI never actually ran the migration set against a live database — every phase's docs said "unverified"                                        | `pnpm migration:run` added as a real CI step, against the same Postgres service the boot smoke test uses |

**Explicitly NOT fixed, with reasons** (see the audit for full detail):
Play Store blockers (native `android`/`ios` folders, app icons, release
signing) were **not** hand-created — generating Gradle/Xcode project
files without the actual Flutter/Gradle/Xcode toolchain to verify them
is more likely to produce broken, hard-to-debug native builds than to
help; running `flutter create .` in a real Flutter environment remains
the correct way to generate these. `pnpm-lock.yaml` still isn't
committed (no network access in this environment to generate one).

## Prerequisites

- Node.js 20.x (`.nvmrc`) and pnpm 9.x (`corepack enable`)
- Flutter 3.24.x / Dart 3.4.x, plus [Melos](https://melos.invertase.dev/) (`dart pub global activate melos`)
- Docker + Docker Compose

## Getting started

```bash
git clone https://github.com/tokenanalyzer/loan-manager.git
cd loan-manager
cp .env.example .env

make setup
# or, equivalently:
#   pnpm install && melos bootstrap
```

Start local infrastructure (PostgreSQL, backend, admin panel):

```bash
make docker-up
```

Run everything in dev mode:

```bash
pnpm dev        # backend + admin panel, via Turborepo
melos run get   # fetch Flutter deps if not already done
```

## Common commands

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `pnpm lint`         | Lint all TS/JS packages                            |
| `pnpm format:check` | Check Prettier formatting across the repo          |
| `pnpm test`         | Run tests for all TS/JS packages                   |
| `melos run analyze` | Static analysis across all Flutter packages        |
| `melos run format`  | Check Dart formatting across all Flutter packages  |
| `melos run test`    | Run tests across all Flutter packages              |
| `make docker-up`    | Start Postgres, backend, and admin panel in Docker |
| `make docker-down`  | Stop the Docker stack                              |

## Environment variables

Copy `.env.example` to `.env` at the root, and copy each app-level
`.env.example` (in `apps/*/`) as needed. Never commit a real `.env`
file — see `.gitignore`.

## CI

GitHub Actions workflows run lint, typecheck, format check, build,
migration run (against a live Postgres service — the first real,
continuous verification of the migration set), boot smoke test, and
test for each app independently (path-filtered), plus a Docker image
build check. See `.github/workflows/`.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for branching, commit
conventions, and the pre-PR checklist. Review ownership is defined in
[`CODEOWNERS`](./CODEOWNERS).

## License

Proprietary — see [`LICENSE`](./LICENSE).

## What Phase 8 added

- **Atomic loan decisions.** `LoanApplicationsService.review()` now
  wraps its approve/reject writes (create loan, update application,
  create notification) in a single TypeORM transaction via the injected
  `DataSource`. A failure mid-decision can no longer leave an APPROVED
  application with no Loan row (or vice versa). `NotificationsService.
createForUser` gained an optional `EntityManager` parameter so it
  participates in the caller's transaction — no duplicated insert logic.
- **Fail-safe Firebase bootstrap.** Both Flutter apps now detect the
  empty placeholder Firebase config and log a clear, actionable error
  instead of calling `Firebase.initializeApp` with blank credentials
  and crashing opaquely. `FIREBASE_ENABLED=false` still no-ops as before.
- **CD/release workflow** (`.github/workflows/cd-customer-app.yml`):
  builds a signed release App Bundle and can publish to Play's internal
  track. Guarded to fail fast with an actionable message until native
  setup exists, so it's safe to commit now.
- **`docs/native-setup.md`**: the exact, ordered runbook for the
  toolchain-dependent production steps (native folders, permissions,
  Firebase config, signing, Play Console listing).

## Roadmap (Phase 9 candidates)

To be confirmed against the project plan: run the `docs/native-setup.md`
runbook to generate native folders + Firebase config + signing (the
prerequisite for any real device build or Play submission), an
admin-invite/provisioning flow for employee/admin accounts, Firebase
Storage swap-in for Documents (replacing local disk), push notification
delivery (FCM — the in-app notifications already exist), a committed
`pnpm-lock.yaml`, and a backend deployment pipeline (the Customer App
CD exists now; the NestJS API still has no deploy target).
