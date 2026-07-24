# Production Readiness Checklist

**Audit date:** 2026-07-24. Scope: Customer App + backend production path only, per instruction — Admin Panel, Employee CRM, and all new features/business-logic changes are explicitly out of scope and untouched. Nothing in this audit changed any configuration; it's a read-only verification pass against the live state described in `docs/PRODUCTION_DEPLOYMENT_CHECKPOINT.md`.

---

## 1. Environment variable audit

Every variable actually set on the live Cloud Run revision (`loan-manager-backend-00005-cqx`), cross-checked against `apps/backend/src/config/env.validation.ts`.

| Variable | Live value | Source | Schema expectation | Status |
|---|---|---|---|---|
| `NODE_ENV` | `production` | plain env var | enum, default `development` | ✅ correct |
| `BACKEND_PORT` | `8080` | plain env var | port, default 3000 | ✅ matches `--port=8080` |
| `BACKEND_HOST` | `0.0.0.0` | plain env var | string, default `0.0.0.0` | ✅ correct |
| `API_PREFIX` | `api` | plain env var | string, default `api` | ✅ correct |
| `CORS_ORIGIN` | **not set** | — | string, default `*` | ⚠️ see note below |
| `LOG_LEVEL` | `info` | plain env var | enum, default `info` | ✅ correct |
| `DATABASE_URL` | secret ref | `DATABASE_URL:latest` | required URI | ✅ present, exactly one enabled version |
| `DATABASE_SSL` | `true` | plain env var | boolean, default false | ✅ correct — required for Cloud SQL |
| `DATABASE_LOGGING` | `false` | plain env var | boolean, default false | ✅ correct for prod (avoids logging query params/PII) |
| `DATABASE_MAX_CONNECTIONS` | `10` | plain env var | integer, default 10 | ✅ correct, see §9 risk on pool sizing |
| `FIREBASE_ENABLED` | `true` | plain env var | boolean, default false | ✅ correct, verified live |
| `FIREBASE_ADMIN_PROJECT_ID` | secret ref | `:latest` | optional string | ✅ present |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | secret ref | `:latest` | optional string | ✅ present |
| `FIREBASE_ADMIN_PRIVATE_KEY` | secret ref | `:latest` | optional string | ✅ present |
| `UPLOADS_DIR` | `/mnt/documents` | plain env var | string, default `./uploads` | ✅ matches the GCS FUSE mount path exactly |

**`CORS_ORIGIN` note:** not set, so it silently defaults to `*` (allow any origin). This is **not a launch blocker for the Customer App** — CORS is a browser-enforced policy and the Customer App is a native Flutter/Android HTTP client, not a browser page, so this setting has zero effect on it. It only matters once a browser-based client (the not-yet-started Admin Panel) calls this API cross-origin. **Must be set to the real Admin Panel origin before that app goes live** — tracked as a future item, not a Customer App blocker. No value was set here because the production domain doesn't exist yet either way.

No unexpected, missing, or extra variables found. No secret values were read back to perform this audit — presence, secret-name references, and IAM bindings were checked, not content.

---

## 2. Cloud Run configuration

Verified via `gcloud run services describe loan-manager-backend --region=asia-south1`.

| Aspect | Value | Assessment |
|---|---|---|
| Revision | `loan-manager-backend-00005-cqx`, 100% traffic | ✅ |
| Ready condition | `True` (Ready, ConfigurationsReady, RoutesReady all `True`) | ✅ |
| Region | `asia-south1` | ✅ matches Cloud SQL/bucket region |
| Service account | `loan-manager-backend-run@...` (dedicated, not default compute SA) | ✅ |
| VPC egress | Direct VPC egress, `private-ranges-only`, network `loan-manager-vpc` | ✅ correct — only routes private-range traffic (Cloud SQL) through the VPC; public internet calls (Firebase Admin's own API calls) go direct, not through a NAT that doesn't exist |
| Cloud SQL connection | `--add-cloudsql-instances` to `loan-manager-prod-db`, Auth Proxy sidecar | ✅ verified live (migrations ran, connection succeeded) |
| Volume mount | GCS FUSE, bucket `loan-manager-india-prod-documents` → `/mnt/documents` | ✅ verified live in logs |
| Ingress | `all` (network-reachable from the internet) | ⚠️ see note below — not a bug, but worth understanding |
| Public IAM access | No `allUsers`/`allAuthenticatedUsers` binding — confirmed empty non-owner IAM policy | ✅ correctly private |
| CPU / memory | 1 vCPU / 512Mi | ✅ adequate for current load; see §9 for scaling note |
| Concurrency | 80 requests/instance | ✅ Cloud Run default, reasonable |
| Min / max instances | **0** / 3 | ⚠️ see §9 — scale-to-zero interacts with the migration-on-boot design |
| Request timeout | 300s | ✅ Cloud Run default |
| Startup probe | TCP :8080, 240s timeout, 1 retry | ✅ generous margin for the migration-on-boot check |
| Image | `...backend/loan-manager-backend:latest` | ✅ pushed, matches latest commit |

**Ingress = `all` note:** this means the network endpoint is reachable from the public internet, but every request still must pass Cloud Run's own IAM invoker check (`--no-allow-unauthenticated`), which currently has **no public bindings** — so in practice nothing unauthenticated can get through. This is the normal, correct way to keep a service privately gated while deployed (`ingress=internal` would be a *stronger* restriction, requiring VPC-internal callers only, which isn't needed here since IAM already fully gates it). No action needed.

---

## 3. Cloud Storage configuration

Verified via `gcloud storage buckets describe` and `get-iam-policy` on `gs://loan-manager-india-prod-documents`.

| Aspect | Value | Assessment |
|---|---|---|
| Location | `ASIA-SOUTH1` | ✅ matches Cloud Run/Cloud SQL |
| Uniform bucket-level access | `true` | ✅ |
| Public access prevention | `enforced` | ✅ — documents can never become publicly readable, even by misconfigured object ACL |
| Soft-delete retention | 7 days | ✅ safety net against accidental deletion |
| Storage class | `STANDARD` | ✅ appropriate for actively-accessed documents |
| Runtime SA access | `loan-manager-backend-run` → `roles/storage.objectAdmin`, scoped to this bucket only | ✅ least privilege |
| Other bindings | Legacy project owner/editor/viewer bucket roles | ℹ️ default GCP project-level bindings, not something this session added, no broader than project-level access already implies |
| Lifecycle rules | None configured | ℹ️ acceptable — documents should be retained indefinitely for a lending product; add a lifecycle rule only if a retention policy is later defined |

---

## 4. Secret Manager references

| Secret | Enabled version | Old versions | IAM access |
|---|---|---|---|
| `DATABASE_URL` | v2 | v1 disabled | `loan-manager-backend-run` only |
| `CLOUDSQL_ROOT_PASSWORD` | v2 | v1 disabled | **no bindings** — correct, the app itself never needs superuser creds |
| `FIREBASE_ADMIN_PROJECT_ID` | v1 | — | `loan-manager-backend-run` only |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | v1 | — | `loan-manager-backend-run` only |
| `FIREBASE_ADMIN_PRIVATE_KEY` | v1 | — | `loan-manager-backend-run` only |

Exactly one enabled version per secret, no orphaned/duplicate live versions, no over-broad IAM grants (no project-wide or `allUsers` bindings on any secret). Cloud Run's `:latest` alias references resolve correctly to these versions.

---

## 5. Firebase configuration

- **Firebase Admin: live and verified.** Cloud Run logs show `Firebase Admin initialized.` on boot; a request to a protected route now returns `401 Missing bearer token` (correct guard behavior) instead of the old `503` fail-closed response from before the secrets existed.
- **Project consistency confirmed:** backend's `FIREBASE_ADMIN_PROJECT_ID` secret, Customer App's `android/app/google-services.json` (`project_id: loan-manager-india`), and the GCP project itself are all the same project — no split-project drift.
- **Phone Auth:** unchanged, frozen, working (per `phone_auth_frozen` memory) — this audit did not touch it.
- **Not yet done (both require the production domain / your Console access, tracked already in the deployment checkpoint, not new findings):**
  - Release keystore SHA-1/SHA-256 fingerprints not yet registered in Firebase Console — **required** before Phone Auth or Google Sign-In will work in a release-signed build.
  - Customer App's `env/production.json` still has a placeholder API URL and `FIREBASE_ENABLED: false` — must be updated once the real domain exists.
- **Not independently re-verified:** the actual *content* of the `FIREBASE_ADMIN_PROJECT_ID` secret wasn't read back to confirm it says `loan-manager-india` byte-for-byte (reading secret values back was avoided deliberately, consistent with "do not print any secrets"). Confidence is high because the source JSON came directly from the Firebase Console for this project, but this is a assumption, not an independently re-verified fact.

---

## 6. Database migrations

- All **27** migration files under `apps/backend/src/database/migrations/` ran successfully on first deploy (`loan-manager-backend-00004-mrd`) — confirmed by counting `"has been executed successfully"` log lines (27, exact match).
- Second deploy (`00005-cqx`, the Firebase-enabling one) correctly logged **`No migrations are pending`** — proves the idempotency design works as intended, not just in theory.
- `migrations` table exists and is the source of truth TypeORM checks on every boot.
- No migration errors, no partial/rolled-back migrations, no manual schema drift outside the migration history.

---

## 7. Production readiness checklist

**Backend / infrastructure — done and verified:**
- [x] Cloud SQL production database + least-privilege app user, schema privileges granted
- [x] Root and app-user passwords rotated after any on-screen exposure
- [x] All 27 migrations applied, idempotency verified
- [x] `DATABASE_URL` in Secret Manager, correct SSL handling (no conflicting `sslmode` param)
- [x] Cloud Storage bucket created, locked down, mounted into Cloud Run
- [x] Artifact Registry image built and pushed
- [x] Dedicated least-privilege Cloud Run runtime service account
- [x] Cloud Run service deployed, healthy, VPC-connected to Cloud SQL
- [x] Firebase Admin secrets created, granted, wired in, verified live
- [x] Service correctly locked down (no public IAM access) pending launch readiness

**Blocked on you (genuine manual/ownership actions, not automatable):**
- [ ] Register release keystore SHA-1/SHA-256 fingerprints in Firebase Console
- [ ] Purchase/point production domain, configure DNS
- [ ] Map custom domain to the Cloud Run service (Google-managed SSL cert, automatic once DNS resolves)

**Deferred until the above are done (deliberately, not overlooked):**
- [ ] Set `CORS_ORIGIN` to a real value (only matters once Admin Panel exists)
- [ ] Update Customer App `env/production.json` with real API URL + `FIREBASE_ENABLED: true`
- [ ] Allow public Cloud Run access (`run.invoker` for `allUsers`)
- [ ] Full live Google Sign-In / Phone Auth round-trip test against the production URL
- [ ] Build and verify the final production Release APK
- [ ] Freeze the Customer App

**Explicitly out of scope for this release (per instruction):** Admin Panel, Employee CRM, any new features, any business logic changes.

---

## 8. Launch day deployment checklist

Run in this order once the domain is live and DNS has propagated:

1. **Confirm DNS propagation** for the production domain (`dig`/`nslookup` from an external network, not just this dev machine).
2. **Map the domain to Cloud Run:**
   `gcloud run domain-mappings create --service=loan-manager-backend --domain=<domain> --region=asia-south1`
   Wait for the managed SSL certificate to provision (can take up to ~24h, usually much faster).
3. **Update `CORS_ORIGIN`** on the Cloud Run service to the real Admin Panel origin (or leave restrictive/off if Admin Panel still isn't live — do not set to `*` in production).
4. **Register the release keystore's SHA-1/SHA-256** in Firebase Console → Project Settings → Your apps → the Android app.
5. **Update `apps/customer-app/env/production.json`**: real `API_BASE_URL` (`https://<domain>/api`), `FIREBASE_ENABLED: true`, real `FIREBASE_PROJECT_ID`.
6. **Allow public access to Cloud Run:**
   `gcloud run services add-iam-policy-binding loan-manager-backend --region=asia-south1 --member=allUsers --role=roles/run.invoker`
7. **Smoke-test the public URL** — hit a real endpoint over HTTPS from an external network (not just from this authenticated dev machine), confirm TLS cert is valid and trusted.
8. **Test the full auth round-trip for real:** Phone OTP sign-in and Google Sign-In from an actual device against the production URL — confirm a Firebase ID token is issued, the backend accepts it, and a user record is created/synced correctly.
9. **Run the full customer journey once, live:** login → loan application → document upload → employee query/rejection (via whatever path currently exists for that) → re-upload → notification → approval.
10. **Build the final signed production Release APK**, pointed at the real production URL.
11. **Verify the APK on a physical device**, same journey as step 9, end-to-end.
12. **Freeze the Customer App** — no further changes without an explicit new decision to unfreeze.
13. Only after all of the above: begin planning the Admin Panel implementation (still not started).

---

## 9. Remaining production risks

Ranked roughly by how much they matter, not by how easy they are to fix.

1. **Cloud SQL is `ZONAL`, not regional/HA.** No automatic failover — a zone outage in `asia-south1` takes the database (and therefore the whole backend) down until Google recovers the zone, with recovery via backups/PITR rather than instant failover. For a lending product handling real financial/KYC data, this is worth a conscious decision: either accept the risk at this stage (small scale, early launch) or upgrade to `REGIONAL` availability (roughly 2x the Cloud SQL cost) before or shortly after real users are onboarded. This is a call only you can make — no code or config change is being suggested here.
2. **Scale-to-zero + migration-on-every-boot.** `min-instances=0` means Cloud Run can fully idle down and cold-start on the next request. The container's `CMD` re-runs `migration:run:prod` on *every* boot, including every cold start — harmless today (idempotent, ~6 seconds observed), but two considerations: (a) if a future migration is slow or takes a lock, every cold start pays that cost until it's the new steady state; (b) if traffic ever causes two cold starts to race concurrently (e.g., a burst after being fully idle), both instances would run `migration:run:prod` against the same database at once — TypeORM's migration runner isn't designed for concurrent execution and could error or double-apply in a bad interleaving, though this is a narrow window (single Cloud SQL connection app, low traffic expected at launch). Mitigation options if this becomes a concern: set `min-instances=1` (removes scale-to-zero entirely, small constant cost), or move migrations to a separate one-off deploy step instead of the container boot path. Not urgent at current expected traffic, but worth knowing before assuming "it just works" at higher scale.
3. **`CORS_ORIGIN` defaults to `*`.** Harmless today (no browser client exists yet), but must not be forgotten when the Admin Panel eventually goes live — a wildcard CORS policy on a production financial API would be a real gap at that point, not now.
4. **No dedicated health-check endpoint.** Verification so far relies on a 404 from an undefined route and Cloud Run's own TCP startup probe — both are reasonable proxies, but neither is a purpose-built liveness/readiness endpoint that could also assert DB connectivity, migration status, or Firebase Admin state on demand. Not a launch blocker; worth considering as a small, explicitly-scoped follow-up (would count as a new feature, so intentionally not added during this audit).
5. **Resource sizing (1 vCPU / 512Mi, max 3 instances) is unvalidated under real load.** Reasonable defaults for a launch with a small initial user base, but there's no load-test data behind these numbers. Watch Cloud Run metrics after real traffic starts and right-size if you see memory pressure or throttling.
6. **Single points of manual knowledge:** the Cloud SQL root password and app-user password only exist in Secret Manager now (by design — nothing was written to disk). If Secret Manager access is ever lost (e.g., accidental IAM lockout), there is no other copy. Standard secret-manager risk, not specific to this deployment, but worth noting for whoever manages GCP IAM long-term.
7. **The downloaded Firebase Admin JSON file still sits in `Downloads` on this dev machine** (`loan-manager-india-firebase-adminsdk-fbsvc-3490bc3444.json`), plus an empty stale one from 2026-07-15. Its contents are already safely in Secret Manager; the file itself is now redundant and is a plaintext production credential sitting outside any secret store. Recommend deleting both files from Downloads once you're confident the Secret Manager copies are correct (not done automatically — your call on when/whether).
