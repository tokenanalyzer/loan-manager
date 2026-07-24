# syntax=docker/dockerfile:1

# ---------- Base ----------
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
WORKDIR /app

# ---------- Dependencies ----------
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-config/eslint-config/package.json packages/shared-config/eslint-config/package.json
COPY packages/shared-config/prettier-config/package.json packages/shared-config/prettier-config/package.json
RUN pnpm install --frozen-lockfile --filter=@loan-manager/backend...

# ---------- Build ----------
FROM deps AS build
COPY . .
RUN pnpm --filter=@loan-manager/shared-types build
RUN pnpm --filter=@loan-manager/backend build

# ---------- Production ----------
# Keeps the same monorepo directory layout as the build stage (root
# node_modules/.pnpm store + apps/backend/node_modules symlinks into it) —
# pnpm's isolated workspace layout means apps/backend's actual runtime deps
# (typeorm, @nestjs/*, pg, ...) live as symlinks under apps/backend/node_modules,
# not hoisted to the root. Flattening into a single /app/{package.json,dist,
# node_modules} (as before) copied only the root node_modules, leaving every
# one of those symlinks missing and the container unable to boot at all.
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
WORKDIR /app/apps/backend
EXPOSE 3000
# Runs pending migrations (idempotent — TypeORM records applied ones) before
# every boot, so a fresh production database gets its schema on first
# deploy without a separate one-off job.
CMD ["sh", "-c", "pnpm run migration:run:prod && node dist/main.js"]
