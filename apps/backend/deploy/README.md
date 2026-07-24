# Backend production deployment (Cloud Run)

Status: **prepared, not deployed.** Nothing in this directory has been
executed against Cloud Run yet — see
`docs/PRODUCTION_DEPLOYMENT_CHECKPOINT.md` at the repo root for the full,
authoritative state of what exists in GCP today.

## What's already provisioned

- Cloud SQL `loan-manager-prod-db` (private IP `10.124.16.3`), database
  `loan_manager_prod`, user `loan_manager_app` — created.
- Secret `DATABASE_URL` in Secret Manager — created, points at the above.
- Secret `CLOUDSQL_ROOT_PASSWORD` — **not yet created**, blocked on an
  explicit go-ahead (see below).
- Cloud Storage bucket `gs://loan-manager-india-prod-documents`
  (`asia-south1`, public access prevention enforced) — created.
- Artifact Registry repo `asia-south1-docker.pkg.dev/loan-manager-india/backend` —
  created, empty (no image pushed yet).
- Service account `loan-manager-backend-run@loan-manager-india.iam.gserviceaccount.com` —
  created, dedicated Cloud Run runtime identity (not the default compute SA).
  Granted: `roles/secretmanager.secretAccessor` on the `DATABASE_URL` secret
  only, `roles/cloudsql.client` at project level (needed for the Cloud SQL
  Auth Proxy sidecar), `roles/storage.objectAdmin` on the documents bucket
  only. Add the `secretAccessor` binding for the `FIREBASE_ADMIN_*` secrets
  once those exist (item 2 below).

## Blocked / outstanding before first deploy

1. **Schema privileges for `loan_manager_app`.** Postgres 16 revokes
   `CREATE` on the `public` schema from non-owners by default. Without the
   grant in `bootstrap-grants.sql`, migrations will fail on a fresh
   database. This requires a SQL connection to the instance's private IP,
   which nothing outside `loan-manager-vpc` can reach — run it via a
   one-off `gcloud run jobs execute` (or a temporary VM in the VPC) *after*
   the backend service below exists with VPC egress configured, connected
   as `postgres`. Setting that superuser's password was blocked by the
   safety classifier pending your explicit approval — see the note in
   session output.
2. **Production Firebase Admin service account key** — Console-only
   action (Firebase Console → Project Settings → Service Accounts →
   Generate new private key). Once you have the JSON, its three fields go
   into Secret Manager as `FIREBASE_ADMIN_PROJECT_ID`,
   `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, and
   `FIREBASE_ENABLED` flips to `"true"` in the service manifest.
3. **Production domain** — not yet purchased/mapped. `CORS_ORIGIN` in
   `cloud-run-service.yaml` is a placeholder until then.
4. **Run migrations** against `loan_manager_prod` once (1) is resolved —
   `pnpm --filter=@loan-manager/backend migration:run` pointed at the
   production `DATABASE_URL`, from somewhere with VPC connectivity.

## Build (safe to run any time — produces an image, no live service)

```bash
gcloud builds submit --config apps/backend/cloudbuild.yaml .
```

Pushes `loan-manager-backend:<short-sha>` and `:latest` to the Artifact
Registry repo above.

## Deploy (do NOT run until the outstanding items above are resolved)

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
