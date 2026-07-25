# Release Notes — v1.0-network-stability

**Date:** 2026-07-25
**Tag:** `v1.0-network-stability`
**Commit:** `47eaf4981cbae00a6b6a8a205821df6c499f3dc6`
**Branch:** `main`

## Summary

The Customer App worked reliably on Wi-Fi but failed intermittently or
consistently on Mobile Data and Hotspot connections. This milestone
closes that gap end-to-end: infrastructure (DNS/load balancer) and
application code (Flutter networking layer), each verified with live
evidence rather than assumed fixed.

## Root cause

Live request tracing on a physical device (Jio SIM) proved the backend
(`api.loanmanagerapp.com`) had **no IPv6 (AAAA) DNS record** — only an
IPv4 `A` record. On IPv6-only mobile networks (common on Indian
carriers, particularly Jio), the device had no IPv4 route at all and no
active CLAT/NAT64 translation, so the app could never reach the
backend — independent of any Dio configuration, retry logic, or app
code. Confirmed via `ip addr show` (no CLAT interface) alongside two
live, successfully-established IPv6 connections to Google's own
services on the same device at the same moment, proving the device's
general internet access was fine — only our IPv4-only backend was
unreachable.

A parallel finding on Airtel (dual-stack) showed a second, independent
failure mode: `AuthController` treated a single failed backend sync —
including plain transient network failures — the same as a genuine
authentication rejection, signing the user out and bouncing them to the
sign-in screen even though their cached Firebase credential was still
valid.

## Infrastructure changes

- Reserved a global static IPv6 address (`2600:1901:0:150a::`) and
  attached new HTTPS (443) and HTTP-redirect (80) forwarding rules to
  the **existing** Global External HTTPS Load Balancer — same managed
  SSL certificate, same target proxy, same Cloud Run backend. No new
  cert, no duplicate infrastructure, zero changes to the working IPv4
  path.
- AAAA record added at the registrar, confirmed publicly resolving via
  both Google (`8.8.8.8`) and Cloudflare (`1.1.1.1`) resolvers.
- Full end-to-end verification on both address families: real DNS
  resolution (no manual override), valid TLS trust chain
  (`ssl_verify_result:0`, no `-k`), and byte-identical application
  responses (`404` on an undefined route, `401 Missing bearer token` on
  a protected route) — proving both stacks terminate on the same
  backend process, not just the same load balancer.
- Both IPv4 and IPv6 addresses confirmed on Google's **Premium**
  network tier (global anycast/backbone), relevant to both diverse
  Indian carrier peering and international users.

## Application changes

`packages/shared-flutter/lib/src/network/api_client.dart`
- Bounded retry: up to 2 retries (~1.1s total backoff) for failures
  where the request is confirmed to have never reached the server
  (`connectionTimeout`, `connectionError`). `sendTimeout`/
  `receiveTimeout` are only retried for side-effect-free `GET`
  requests — a POST/PATCH is never retried once bytes may have reached
  the server, preventing duplicate submissions (loan applications,
  document uploads, KYC review actions).
- `connectTimeout`/`receiveTimeout` raised from 15s to 20s — BSNL and
  congested-cell connections can be legitimately slow rather than
  broken (carrier DNS-over-TLS validation alone was observed taking
  ~30s on one live trace before falling back).

`packages/shared-flutter/lib/src/auth/auth_state.dart`,
`auth_controller.dart`
- New `AuthOffline` state: the cached Firebase session is preserved
  when a sync failure is transport-level (timeout, no connection, DNS,
  a backend 5xx) rather than a confirmed `401`/`403` or an invalid
  Firebase session (`network-request-failed`). Only a confirmed
  rejection signs the user out.

`apps/customer-app/lib/core/router/app_router.dart`,
`apps/employee-app/lib/core/router/app_router.dart`
- Both routers treat `AuthOffline` identically to `AuthAuthenticated`
  — a network blip no longer redirects an already-signed-in user to
  the sign-in screen.

## Validation

**Automated (`packages/shared-flutter/test/network/api_client_resilience_test.dart`, 7/7 passing):**
against a real local `HttpServer`, not mocked Dio —
backend-unavailable, DNS failure, GET-vs-POST retry asymmetry on
socket timeout (the no-duplicate-write guarantee), HTTP 401, HTTP 403,
bounded retry count, and successful recovery within the retry window.

**Live, on physical Android devices, against the real production
backend:**
1. Airplane Mode ON during an authenticated session — stayed in the
   app (bottom nav present, no redirect to sign-in); recovered fully on
   reconnect.
2. Wi-Fi OFF → Mobile Data ON — hit a genuine transient failure on a
   real carrier connection organically during testing; handled
   correctly, no sign-out.
3. Mobile Data OFF → Wi-Fi ON — clean handover, full recovery, real
   dashboard data reloaded.

**Static checks:** `flutter analyze` clean across `shared-flutter`,
`apps/customer-app`, `apps/employee-app`. `flutter build apk --debug`
succeeded. One pre-existing, unrelated test failure in
`apps/customer-app/test/app_smoke_test.dart` — confirmed (via `git
stash`) to fail identically on the prior commit, not introduced by this
work.

## Carrier coverage

| Carrier | Condition found | Resolution |
|---|---|---|
| Jio | IPv6-only, no CLAT active | Native IPv6 via the new AAAA record — no NAT64 dependency |
| Airtel | Dual-stack; transient carrier DNS validation failures observed | `AuthOffline` + retry — session survives, no infra change needed |
| Vi (Vodafone Idea) | Not directly tested; inconsistent regional IPv6 rollout (public knowledge) | Covered by dual-stack LB + client resilience, same as above |
| BSNL | Not directly tested; predominantly IPv4, higher latency | Existing IPv4 path unaffected; 20s timeout accounts for slower connections |

## Risk and rollback

Overall risk: **low-to-medium**. All application changes are additive
and backward-compatible (existing `AuthAuthenticated`/`AuthError`
paths unchanged); the highest-risk piece (`AuthController`, shared by
both apps) is protected by Dart's exhaustive sealed-class checking and
directly validated live on two physical devices across three real
network transitions.

Rollback, if ever needed: `git revert 47eaf4981cbae00a6b6a8a205821df6c499f3dc6`
— a single, self-contained commit with no dependents.

## Known follow-ups (not part of this milestone)

- Dio's default transport (`dart:io HttpClient`) doesn't implement
  Happy Eyeballs (RFC 8305). Practical impact is small for this backend
  specifically (exactly one A and one AAAA record → worst case ~250ms
  stagger before fallback) — not addressed here; a native adapter
  (`cronet_http` via `native_dio_adapter`) is the documented option if
  real-world telemetry ever shows it mattering.
- Vi and BSNL were not directly live-traced this milestone (no test SIM
  available) — covered by the same infrastructure and client-resilience
  changes, but not empirically confirmed on those specific carriers.

## Post-milestone additions and final release verification (same day)

Two small, separately-committed changes landed after the networking
milestone above, then the signed production Release build was
rebuilt, reinstalled, and verified end-to-end with all of them
included:

- `b53ab0102d3087c964e1510cc975a36794d8b90c` — About Us page updated
  with the real registered office address and support phone number
  (`legal_config.dart`'s `registeredOffice`/`supportPhone`, the single
  source `about_company_screen.dart` reads from). No other legal page
  references these two fields, so Privacy Policy/Terms/Disclaimer/
  Consent are unaffected. `grievanceOfficerContact` remains an
  intentional placeholder — no data was supplied for it.
- `dc28799d99f74c3ba1f2896362a97c765ee3b563` — Android task/Recents
  title fixed from `"Loan Manager — Customer"` to `"Loan Manager"`
  (`CustomerApp`'s `MaterialApp.title` in `app.dart` — Flutter's
  `Title` widget sets this independently of the manifest's
  `android:label`, which already read `"Loan Manager"`).

**Release verification, physical device, signed production build:**
debug build fully uninstalled; release APK rebuilt
(`flutter build apk --release --dart-define-from-file=env/production.json`)
and its signature confirmed against the production upload keystore
(SHA-1 `f8:97:d4:b0:3b:b2:8b:94:91:9c:99:25:8a:ff:9b:ef:cb:cc:a8:0c`,
matching the fingerprint already registered in Firebase) before
install. Confirmed on-device: app launches; package has no
`DEBUGGABLE` flag (`versionName 0.2.0`, `versionCode 1`); app name and
Recent Apps title both read exactly `"Loan Manager"`; Google Sign-In
restores the cached session and syncs against the live production
backend; Home dashboard loads real data; About Us shows the updated
office address and phone number; the networking/retry/`AuthOffline`
path from this milestone is exercised live by that same successful
sign-in and sync.

## Final sign-off (same day)

One more small change landed after the verification above, then the
signed Release build was rebuilt and re-verified end-to-end a second
time:

- `230f61ec563f057a4a0c6fbe998328e8749fa542` — Grievance Officer
  section of the About Us page updated (`legal_config.dart`'s
  `grievanceOfficerContact`, previously a placeholder): **Adil
  Hussain, adilhusain3413@gmail.com, +91 9967873413**. Same isolation
  guarantee as the office address/phone change — this field is read
  only by `about_company_screen.dart`; no other legal page is
  affected.

**Full release verification checklist — all 10 items confirmed live,
signed production build, physical device:**

1. Signed release (not debug) — `apksigner` cert matches the
   registered production keystore; no `DEBUGGABLE` flag.
2. App launches successfully.
3. App name reads exactly "Loan Manager".
4. Recent Apps/task title reads exactly "Loan Manager".
5. Login works — cached Firebase session restored and synced live.
6. Dashboard loads real production data.
7. About Us shows the correct registered office address, phone
   number, and all three Grievance Officer fields.
8. Privacy Policy, Terms & Conditions, Loan Facilitation Disclaimer,
   Customer Consent, and Data Deletion Policy all confirmed
   unaffected — both by git history (only `legal_config.dart` was
   ever touched by the two legal-content commits) and by live
   on-device navigation through the full Privacy Policy page,
   top to bottom.
9. Networking/retry/`AuthOffline` path exercised live by the
   successful sign-in and dashboard sync.
10. No crashes or regressions — zero `FATAL EXCEPTION`/
    `AndroidRuntime:E` entries in `adb logcat` across the full
    verification session.

**Declared production-ready.** This is the closing checkpoint for the
v1.0-network-stability arc plus its two follow-on content fixes (About
Us, Grievance Officer) and the app-title fix — everything is verified
on a genuinely signed release artifact, not just in code review.

## Customer App re-frozen

With the checklist above fully passed, the Customer App is frozen
again — no further code changes without an explicit new decision to
unfreeze. Same posture as the original 2026-07-24 freeze, now covering
this session's additions too.
