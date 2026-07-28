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

## Customer App re-frozen (2026-07-25)

With the checklist above fully passed, the Customer App was frozen —
no further code changes without an explicit new decision to unfreeze.
Same posture as the original 2026-07-24 freeze. Superseded by the
2026-07-28 unfreeze below.

---

# Customer App Backend Integration (2026-07-28 — in progress)

**Unfrozen** for a new initiative: the Admin Panel side of the product
reached a natural completion point and is now frozen instead (see
`admin_panel_frozen` project memory); development focus moved to the
Customer App with an explicit mandate to integrate it completely with
backend capability that's grown since the app was last touched
(2026-07-25). A pre-planning audit (full codebase read, both sides)
found real backend data already traveling to the app over the wire and
being silently dropped by the Flutter model layer, plus one declared
dependency (`firebase_messaging`) with zero implementation. Full plan
in `.claude/plans/linear-swinging-squirrel.md`. Same phase-by-phase
cadence as the completed Admin Panel initiatives: implement → verify →
commit → push → document → report, continuing autonomously between
phases.

## Phase 1 — Case Number + waiting-for-customer status ✅ 2026-07-28

**What:** `LoanApplicationResponseDto` has included `caseNumber` and
`waitingForCustomer`/`waitingForCustomerSince` since the Case Number
and Document Versioning backend work landed — sent over the exact same
`GET /v1/loan-applications`/`GET /v1/loan-applications/:id` endpoints
the app already calls, gated by no extra permission. The Flutter model
just never parsed them. No backend change needed for this phase.

- `LoanApplication` (`lib/core/models/loan_application.dart`) gained
  `caseNumber` (required), `waitingForCustomer` (default false),
  `waitingForCustomerSince`.
- `caseNumber` now shown on `my_applications_screen.dart`'s list rows
  and `application_detail_screen.dart`'s header — the same
  `LM-2026-XXXXXX` reference format staff already see and customers
  already quote to support.
- `waitingForCustomer` is a document-level re-upload flag, deliberately
  distinct from the existing `status == 'query_raised'` banner (an
  application-level query) — per the backend's own doc comment on
  `LoanApplicationsService.setWaitingForCustomer`, the two can be true
  at the same time without contradiction. Added a second, separately
  worded banner on the detail screen so both signals stay visible and
  distinguishable rather than collapsing into one ambiguous message.

**Verified:** `flutter analyze` clean (both the 3 touched files and
the full project). `flutter build apk --debug` compiled successfully.
`flutter test` has exactly one pre-existing failure
(`test/app_smoke_test.dart`, a `pumpAndSettle` timeout) — confirmed via
`git stash` to fail identically on the commit before this change, not
a regression introduced here. No live device available in this
environment to visually confirm the new UI; the change is a
straightforward, analyzer-clean data/text addition to already-proven
screens, so this is a real, disclosed verification gap, not a claim
this was seen rendered.

## Phase 2 — Customer-facing Document Version History ✅ 2026-07-28

**What:** Document Versioning (immutable per-upload history) has
existed on the backend for a while, but only had a staff-facing
endpoint (`GET /v1/documents/staff/:id/versions`) — a customer had no
way to see what happened to their own re-uploaded documents.

- Backend: new `GET /v1/documents/:id/versions` (customer-facing,
  `@Auth(UserRole.CUSTOMER)`), reusing the exact same data-fetch tail
  as the staff endpoint (`DocumentVersionRepository.findAllByDocument`
  → DTO mapping) but swapping the staff access check for the existing
  `getOwnedDocumentOrThrow` ownership guard. New
  `DocumentVersionCustomerResponseDto` omits `uploadedByName`/
  `verifiedByName` (present on the internal staff DTO) — customers see
  verification status/notes/dates, never which staff member acted,
  matching how no other customer-facing surface names an internal
  reviewer.
- Customer App: `DocumentRepository.getVersions`, a new
  `DocumentVersion` model, and a version-history screen reachable from
  the document preview screen's app bar (a new "Version history" icon
  action) — mirrors the Admin Panel's `VersionHistoryModal.tsx`
  concept as a full mobile screen rather than a modal. Added
  `StatusBadge.forDocumentVerificationStatus` to `shared-flutter`,
  matching the package's existing `forApplicationStatus`/
  `forKycStatus` factory convention instead of hand-rolling a one-off
  status-color widget.

**Verified:** backend — 149/149 tests pass (2 new:
`getVersionsForOwner` returns the owner's history with staff-identity
fields stripped; rejects a document that doesn't belong to the
caller), `tsc --noEmit` clean. Frontend — `flutter analyze` clean
across `shared-flutter` and `apps/customer-app`, `flutter build apk
--debug` compiled successfully. Same disclosed gap as Phase 1: no live
device in this environment to visually confirm the new screen renders
correctly — analyzer-clean and compile-verified only.

## Phase 3 — Push Notifications: backend ✅ 2026-07-28

**What:** `firebase_messaging` has been a declared Customer App
dependency with zero implementation. This phase wires the entire
backend half — no Customer App change yet (Phase 4).

- Migration `AddFcmTokenToUsers`: single `fcm_token`/
  `fcm_token_updated_at` columns on `users` (matches the existing
  single-value `last_device` precedent — no multi-device table).
  Verified live against the dev database with a full `migration:run`
  → `revert` → `run` cycle, confirming `down` is symmetric.
- `FirebaseAdminService.sendPushNotification` wraps
  `admin.messaging().send(...)` using the same already-loaded
  service-account credential Auth already uses — no separate
  `FCM_SERVER_KEY` (that's the legacy pre-v1 HTTP API, unused here).
  Never throws, same discipline as the existing `revokeSessions` — a
  push failure must never fail the business transaction that
  triggered the underlying notification. Reports a stale token so the
  caller can stop retrying a token FCM will never accept again.
- **Zero changes needed at any of the 16 existing notification call
  sites**: `NotificationsService.createForUser` is the one choke
  point they already all go through (KYC decisions, loan approve/
  reject/query/disburse, document re-upload, lead assignment,
  maker-checker, work-status) — the push send was added inside it,
  right after the in-app row is created, using the notification's own
  `title`/`body`/`relatedEntityType`/`relatedEntityId` as the payload.
- New `POST /v1/auth/me/device-token` (any authenticated role, not
  customer-only — staff benefit too) registers/refreshes the caller's
  token, idempotent, safe to call on every app foreground/refresh.

**Verified:** backend — 159/159 tests pass (+10 new: FirebaseAdminService
push-send/stale-token-detection/no-op-when-Firebase-unconfigured, and
a new `NotificationsService` suite covering push-send, skip-when-
no-token, skip-when-recipient-missing, stale-token-clearing, and the
transactional-manager code path), `tsc --noEmit` clean. Live-verified
against the real dev backend: both new endpoints (`POST /v1/auth/me/
device-token`, `GET /v1/documents/:id/versions`) resolve to `401`
(correctly guarded) rather than `404` (an unreachable typo) — proves
the routes are wired, not just unit-tested in isolation. Full FCM
send/receive was not live-tested — no real device token exists yet
until Phase 4 registers one from an actual device.

## Phase 4 — Push Notifications: Customer App ✅ 2026-07-28

**What:** completes the loop started in Phase 3 — `firebase_messaging`
had been a declared dependency with zero implementation until now.

- `fcm_background_handler.dart`: a minimal top-level handler
  registered via `FirebaseMessaging.onBackgroundMessage` right after
  `Firebase.initializeApp()` (`firebase_bootstrap.dart`) — satisfies
  FCM's isolate-registration contract. Deliberately does nothing else
  (per the plan's scope decision): Android already renders the
  system-tray notification for a backgrounded/terminated app from
  FCM's own `notification` payload — no `flutter_local_notifications`
  dependency added.
- `fcm_service.dart`: permission request + token registration tied to
  `AuthController`'s state (via GetIt, not Riverpod — the endpoint
  needs an authenticated session, so this fires once one exists and
  again on every future sign-in), token refresh handling, a
  foreground-message handler that silently invalidates
  `notificationsProvider` (no system-tray duplication while
  foregrounded, per the plan), and `onMessageOpenedApp`/
  `getInitialMessage` tap-to-open handling.
- `notification_deep_link.dart`: the `relatedEntityType` routing
  switch extracted from `notifications_screen.dart` into one shared
  function, now used by both the in-app list tap and FCM's tap
  handlers so the two paths can never drift apart.
- `UserRepository.updateDeviceToken` wraps the new backend endpoint.
- `main.dart` now builds its own `ProviderContainer`
  (`UncontrolledProviderScope` instead of `ProviderScope`) so
  `FcmService` can invalidate a Riverpod provider from outside the
  widget tree — `app_smoke_test.dart` pumps `CustomerApp` under its
  own `ProviderScope` directly and never calls `main()`, so this is a
  no-op for that test (confirmed, not assumed).

**Verified:** `flutter analyze` clean across `shared-flutter` and
`apps/customer-app`. `flutter build apk --debug` compiled
successfully. `flutter test` has the same single pre-existing
`app_smoke_test.dart` failure as every prior phase, unchanged. **No
Android device in this environment** — permission prompts, token
retrieval, foreground/background delivery, and tap deep-linking are
analyzer-clean and compile-verified only, not seen running. A real
device is needed to confirm push notifications actually work
end-to-end; this is the last remaining gap before the initiative's
Final QA phase.

## Phase 5 — Cleanup + Final QA ✅ 2026-07-28 — initiative complete

**What:** closes the 5-phase Customer App Backend Integration
initiative. No new features this phase — cleanup and full
verification only.

- Removed `apps/customer-app/lib/features/loans/loan_details_screen.dart`
  — its own doc comment confirmed it unreachable since the
  pre-application-calculator removal; re-confirmed via a fresh grep
  immediately before deleting that nothing still referenced it.
- Full verification pass across everything touched by all 5 phases:
  backend `tsc --noEmit` clean, `npx jest` 159/159 across 18 suites.
  `flutter analyze` clean across `shared-flutter` and
  `apps/customer-app` (zero issues, not just zero *new* issues).
  `flutter test` — the same single pre-existing `app_smoke_test.dart`
  `pumpAndSettle` timeout as every phase (confirmed via `git stash`
  back in Phase 1 to predate this initiative entirely; still present
  and still the *only* failure). `flutter build apk --debug` compiled
  successfully.

**What this initiative shipped, end to end:**
1. Case Number + a document-level "waiting for you" signal now
   surface in the app (data the backend was already sending, silently
   dropped before).
2. Customers can see their own document version/re-upload history for
   the first time (`GET /v1/documents/:id/versions`, new both sides).
3. Push notification infrastructure exists start to finish: FCM token
   storage, best-effort send wired into every one of the 16 existing
   notification-creation call sites with zero call-site changes,
   Customer App permission/registration/foreground/background/tap
   handling.
4. One dead screen removed.

**What's explicitly still open, not silently dropped:**
- **Push notifications have never run on a real device.** Everything
  is analyzer-clean and compile-verified, and the backend half was
  live-verified (endpoints correctly guarded, real migration
  run/revert/run cycle) — but permission prompts, actual token
  delivery, a real push arriving in any of the three app states
  (foreground/background/terminated), and tap-to-deep-link have only
  been reasoned through in code review. **The next real step for this
  feature is installing a debug build on an actual Android device (or
  emulator with Play Services) and walking through all three delivery
  states.**
- Deferred, no backend domain exists to integrate with (unchanged from
  the plan): `GET /v1/lending-partners`, a real loan-products catalog,
  repayment-schedule tracking, third-party PAN/Aadhaar KYC
  verification.

## Customer App remains unfrozen

Unlike every prior arc in this document, the Customer App is **not**
being re-frozen at the close of this initiative — the user's own
framing ("start development of the Customer App") was a general
reopening, not a scoped one-off fix, and the one concrete gap
(on-device push verification) is exactly the kind of follow-up that
belongs in continued active development, not a freeze-then-reopen
cycle. See `project_customer_app_backend_integration` (session memory)
for the full phase-by-phase record.
