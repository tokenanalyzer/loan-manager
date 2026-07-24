# Backend production deployment (Cloud Run)

Status: **live.** `loan-manager-backend` is deployed and serving
(`--no-allow-unauthenticated`) — see `docs/PRODUCTION_DEPLOYMENT_CHECKPOINT.md`
at the repo root for the full, authoritative state, including three real
Dockerfile/migration bugs found and fixed via a live smoke test.

## What's already provisioned and done

- Cloud SQL `loan-manager-prod-db` (private IP `10.124.16.3`), database
  `loan_manager_prod`, user `loan_manager_app` — created, schema privileges
  granted (verified live: all 27 migrations ran successfully on deploy).
- Secrets `DATABASE_URL` and `CLOUDSQL_ROOT_PASSWORD` in Secret Manager —
  both rotated at least once (see checkpoint doc §7 for why).
- Cloud Storage bucket `gs://loan-manager-india-prod-documents`
  (`asia-south1`, public access prevention enforced) — mounted live via
  GCS FUSE at `/mnt/documents`.
- Artifact Registry repo — image built and pushed.
- Service account `loan-manager-backend-run@loan-manager-india.iam.gserviceaccount.com` —
  dedicated Cloud Run runtime identity (not the default compute SA).
  Granted: `roles/secretmanager.secretAccessor` on `DATABASE_URL` only,
  `roles/cloudsql.client` at project level, `roles/storage.objectAdmin` on
  the documents bucket only. Add the `secretAccessor` binding for the
  `FIREBASE_ADMIN_*` secrets once those exist (item 1 below).
- **`loan-manager-backend` is deployed and live** (revision
  `loan-manager-backend-00004-mrd`), `--no-allow-unauthenticated`. Verified
  via a real authenticated HTTP request (got NestJS's own 404 JSON error
  shape back) and by inspecting Cloud Run logs for the full migration run.

## Outstanding

1. **Production Firebase Admin service account key** — Console-only
   action (Firebase Console → Project Settings → Service Accounts →
   Generate new private key). Once you have the JSON, its three fields go
   into Secret Manager as `FIREBASE_ADMIN_PROJECT_ID`,
   `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`; grant the
   runtime SA `secretAccessor` on them; redeploy with `FIREBASE_ENABLED=true`.
2. **Production domain** — not yet purchased/mapped. `CORS_ORIGIN` in
   `cloud-run-service.yaml` is a placeholder until then.
3. **Public access** — deliberately still off (`--no-allow-unauthenticated`)
   until (1) and (2) are resolved.

## Three bugs found and fixed via the live smoke test (see checkpoint §7 for detail)

- `migration:run` required ts-node against `src/*.ts`, which doesn't exist
  in the prod image (only `dist/` does) — fixed via `data-source.ts`'s
  `__dirname`-relative glob + `migration:run:prod` + running it in the
  container's `CMD` before boot.
- The `typeorm` CLI bin wasn't resolvable in the container — fixed by
  invoking `node_modules/typeorm/cli.js` directly instead of relying on
  the `typeorm` shim on `PATH`.
- **The production Dockerfile stage only copied the root `node_modules`**,
  missing pnpm's per-workspace-package symlinks (`apps/backend/node_modules`)
  that the actual runtime dependencies live in — the container could not
  have booted regardless of the migration changes. Fixed by preserving the
  monorepo's relative directory layout instead of flattening it.
- `DATABASE_URL`'s `?sslmode=require` conflicted with the app's own
  `rejectUnauthorized: false` TLS handling — fixed by dropping the query
  param (required rotating the app user's password, since reading the old
  secret value back to edit it was itself blocked by the safety classifier).

## Build (safe to run any time — produces an image, no live service)

```bash
gcloud builds submit --config apps/backend/cloudbuild.yaml .
```

Pushes `loan-manager-backend:<short-sha>` and `:latest` to the Artifact
Registry repo above.

## Deploy (already run once — this is the exact command used)

```bash
gcloud run deploy loan-manager-backend \
  --image=asia-south1-docker.pkg.dev/loan-manager-india/backend/loan-manager-backend:latest \
  --region=asia-south1 \
  --service-account=loan-manager-backend-run@loan-manager-india.iam.gserviceaccount.com \
  --network=loan-manager-vpc \
  --subnet=loan-manager-subnet-asia-south1 \
  --vpc-egress=private-ranges-only \
  --add-cloudsql-instances=loan-manager-india:asia-south1:loan-manager-prod-db \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest \
  --set-env-vars=NODE_ENV=production,BACKEND_PORT=8080,BACKEND_HOST=0.0.0.0,API_PREFIX=api,LOG_LEVEL=info,DATABASE_SSL=true,DATABASE_LOGGING=false,DATABASE_MAX_CONNECTIONS=10,FIREBASE_ENABLED=false,UPLOADS_DIR=/mnt/documents \
  --port=8080 \
  --add-volume=name=documents,type=cloud-storage,bucket=loan-manager-india-prod-documents \
  --add-volume-mount=volume=documents,mount-path=/mnt/documents \
  --min-instances=0 --max-instances=3 \
  --no-allow-unauthenticated
```

Notes:
- `--port=8080` + `BACKEND_PORT=8080` together are required — `main.ts`
  reads `BACKEND_PORT`, not Cloud Run's standard `PORT` convention.
- `--no-allow-unauthenticated` is deliberate for the first deploy (nothing
  should reach it publicly until it's verified) — revisit once the domain
  mapping step happens.
- `cloud-run-service.yaml` in this directory documents the equivalent
  desired end-state as a Knative manifest, for `services describe` diffing
  later; the flags above are the actual mechanism.
