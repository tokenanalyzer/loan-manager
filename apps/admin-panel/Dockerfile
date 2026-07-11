# syntax=docker/dockerfile:1

# ---------- Base ----------
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
WORKDIR /app

# ---------- Dependencies ----------
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/admin-panel/package.json apps/admin-panel/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-config/eslint-config/package.json packages/shared-config/eslint-config/package.json
COPY packages/shared-config/prettier-config/package.json packages/shared-config/prettier-config/package.json
RUN pnpm install --no-frozen-lockfile --filter=@loan-manager/admin-panel...

# ---------- Build ----------
FROM deps AS build
COPY . .
RUN pnpm --filter=@loan-manager/shared-types build
RUN pnpm --filter=@loan-manager/admin-panel build

# ---------- Production (static, served via nginx) ----------
FROM nginx:1.27-alpine AS production
COPY --from=build /app/apps/admin-panel/dist /usr/share/nginx/html
COPY apps/admin-panel/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
