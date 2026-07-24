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
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
# Runs pending migrations (idempotent — TypeORM records applied ones) before
# every boot, so a fresh production database gets its schema on first
# deploy without a separate one-off job.
CMD ["sh", "-c", "pnpm run migration:run:prod && node dist/main.js"]
