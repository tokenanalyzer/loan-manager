#!/usr/bin/env bash
# Bootstrap script for local development.
# Installs JS/TS workspace dependencies and Flutter workspace dependencies.
set -euo pipefail

echo "==> Checking prerequisites..."
command -v node >/dev/null || { echo "Node.js is required."; exit 1; }
command -v pnpm >/dev/null || { echo "pnpm is required (run: corepack enable)."; exit 1; }
command -v flutter >/dev/null || { echo "Flutter is required."; exit 1; }

if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
fi

echo "==> Installing JS/TS workspace dependencies (pnpm)"
pnpm install

echo "==> Activating Melos"
dart pub global activate melos

echo "==> Bootstrapping Flutter workspace (melos)"
melos bootstrap

echo "==> Done. Next steps:"
echo "    - Fill in real values in .env"
echo "    - docker compose -f infra/docker/docker-compose.yml up -d"
echo "    - pnpm dev"
