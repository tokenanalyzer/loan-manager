# Loan Manager Enterprise

Enterprise monorepo for the Loan Manager platform: two Flutter client
apps, a NestJS backend, and a React admin panel, sharing common
tooling and infrastructure.

> **Status: Phase 1 — Repository Foundation.**
> This phase establishes the monorepo structure, tooling, and
> infrastructure only. There is intentionally **no UI, no
> authentication, no API endpoints, no database schema, and no
> business logic** yet — those land in subsequent phases.

## Tech stack

| Layer              | Technology                          |
|---------------------|--------------------------------------|
| Customer app        | Flutter                              |
| Employee app        | Flutter                              |
| Backend             | NestJS (Node.js / TypeScript)        |
| Admin panel         | React + Vite (TypeScript)            |
| Database            | PostgreSQL                           |
| Authentication      | Firebase Authentication *(planned)*  |
| File storage        | Firebase Storage *(planned)*         |
| Push notifications  | Firebase Cloud Messaging *(planned)* |

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

| Command                | Description                                      |
|--------------------------|---------------------------------------------------|
| `pnpm lint`              | Lint all TS/JS packages                           |
| `pnpm format:check`      | Check Prettier formatting across the repo          |
| `pnpm test`              | Run tests for all TS/JS packages                   |
| `melos run analyze`      | Static analysis across all Flutter packages         |
| `melos run format`       | Check Dart formatting across all Flutter packages   |
| `melos run test`         | Run tests across all Flutter packages               |
| `make docker-up`         | Start Postgres, backend, and admin panel in Docker |
| `make docker-down`       | Stop the Docker stack                              |

## Environment variables

Copy `.env.example` to `.env` at the root, and copy each app-level
`.env.example` (in `apps/*/`) as needed. Never commit a real `.env`
file — see `.gitignore`.

## CI

GitHub Actions workflows run lint, typecheck, format check, build,
and test for each app independently (path-filtered), plus a Docker
image build check. See `.github/workflows/`.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for branching, commit
conventions, and the pre-PR checklist. Review ownership is defined in
[`CODEOWNERS`](./CODEOWNERS).

## License

Proprietary — see [`LICENSE`](./LICENSE).

## Roadmap (phases beyond this one)

Phase 1 covers the foundation only. Planned subsequent phases (order
to be confirmed against the project plan) include: PostgreSQL schema
and migrations, NestJS API implementation, Firebase Authentication
integration, and application UI for the customer app, employee app,
and admin panel.
