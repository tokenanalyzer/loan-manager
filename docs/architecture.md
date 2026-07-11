# Architecture Overview — Phase 1 (Foundation)

This document describes the repository foundation established in Phase 1.
It intentionally contains no API, schema, authentication, or UI design —
those are addressed in later phases.

## Monorepo layout

```
loan-manager/
├── apps/
│   ├── backend/          NestJS API service (bootstrap only)
│   ├── admin-panel/      React + Vite admin web app (build tooling only)
│   ├── customer-app/     Flutter app for customers (package/tooling only)
│   └── employee-app/     Flutter app for employees (package/tooling only)
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

| Concern                        | Tool                          |
|---------------------------------|--------------------------------|
| JS/TS package management        | pnpm workspaces                |
| JS/TS task orchestration/caching| Turborepo                      |
| Flutter/Dart workspace           | Melos                          |
| Linting (TS)                    | ESLint (shared config package) |
| Linting (Dart)                  | flutter_lints                  |
| Formatting (TS/JS/JSON/MD)      | Prettier                       |
| Formatting (Dart)                | `dart format`                  |
| Local infra                     | Docker Compose (Postgres, services) |
| CI                               | GitHub Actions                 |

## Planned data & auth layer (not yet implemented)

- **PostgreSQL** — primary relational datastore. Connection is wired via
  `DATABASE_URL`; no schema/migrations exist yet.
- **Firebase Authentication** — planned identity provider for both Flutter
  apps and the admin panel. SDK dependencies are declared but not
  initialized.
- **Firebase Storage** — planned file/object storage.
- **Firebase Cloud Messaging** — planned push notification delivery.

## Phase boundaries

Phase 1 deliberately stops at the foundation layer: folder structure,
dependency wiring, lint/format/build configuration, Docker, and CI.
Subsequent phases will introduce, in order to be determined by the
project plan: database schema, backend APIs, authentication flows, and
application UI for each client.
