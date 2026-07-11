# Contributing

## Prerequisites

- Node.js 20.x (see `.nvmrc`)
- pnpm 9.x (`corepack enable`)
- Flutter 3.24.x + Dart 3.4.x
- Melos (`dart pub global activate melos`)
- Docker + Docker Compose

## Getting started

```bash
git clone https://github.com/tokenanalyzer/loan-manager.git
cd loan-manager
cp .env.example .env

# JS/TS workspace (backend, admin panel, shared packages)
pnpm install

# Flutter workspace (customer app, employee app, shared_flutter)
melos bootstrap
```

## Branching

- `main` — production-ready, protected
- `develop` — integration branch
- `feature/<name>`, `fix/<name>`, `chore/<name>` — short-lived branches off `develop`

## Commit style

Conventional Commits are recommended, e.g.:

```
feat(backend): add config module bootstrap
fix(admin-panel): correct vite dev server port
chore(repo): update lint config
```

## Before opening a PR

```bash
pnpm lint && pnpm format:check && pnpm test
melos run analyze && melos run format && melos run test
```

## Code ownership

See `CODEOWNERS` for review routing by directory.
