# TODO — Next Session

Next session's stated focus: **Splash Screen, Launcher Icon, Branding
animation, and final polish** for the Customer App. Branding assets
(`app_icon.png`, `logo_transparent.png`, `splash_logo.png`) are already in
`apps/customer-app/assets/branding/` as of the `4e3e6f1` checkpoint, but not
yet wired into `pubspec.yaml`, `flutter_launcher_icons`/native splash
config, or any code.

## 0. Commit/push status — resolved
Everything through 2026-07-16/17 is committed and pushed: `4e3e6f1` on
`main`, confirmed even with `origin/main`. No uncommitted work outstanding.
`flutter analyze`, `flutter test`, backend `build`, and backend `typecheck`
all pass cleanly as of this checkpoint — no known production blockers.

## 1. Finish the on-device manual QA pass (deferred from 2026-07-16/17)
The Document Manager (camera/gallery/file-PDF upload, preview, replace,
delete) is fully verified on-device. The loan wizard was verified through
Step 9 (Documents) for Home Loan only. Still needed before calling the
Customer App fully QA'd:
- Reach and visually confirm the completed **Review step** (Step 10) — was
  mid-upload of Sale Agreement/Registry Document (Home-specific required
  docs) when the session stopped. Logic is code-reviewed and correct; just
  needs eyes-on confirmation.
- Walk the wizard for the remaining 5 loan categories: **Personal,
  Business, Education, Vehicle, Gold** (only Home Loan was walked this
  session).
- **Profile screen** — the new sign-out confirmation dialog hasn't been
  tapped on-device yet (code-reviewed only).
- **Notifications screen** — not touched this session.
- A backend dev server (`npm run dev`) may still be running locally from
  this session on port 3000 — verify/restart before resuming device
  testing (`cd apps/backend && npm run dev`), and confirm
  `env/development.json`'s `API_BASE_URL` still matches this machine's LAN
  IP (it's hardcoded, e.g. `http://192.168.1.9:3000/api` — breaks silently
  if the machine's IP changes, since Android also silently drops cleartext
  traffic to a *wrong* IP the same way it did to a *blocked* one — see next
  item).
- Remember: **Android blocks cleartext HTTP by default** —
  `android/app/src/debug/AndroidManifest.xml` now has
  `usesCleartextTraffic="true"` fixing this for debug builds. If a fresh
  device/emulator ever silently fails all API calls again after a real
  Firebase sign-in succeeds, this is the first thing to check.

## 2. Splash Screen / Launcher Icon / Branding (next session's focus)
- Wire `assets/branding/app_icon.png` into the Android/iOS launcher icon
  pipeline (likely `flutter_launcher_icons` package — not yet a
  dependency).
- Wire `assets/branding/splash_logo.png` into a native splash screen
  (likely `flutter_native_splash` — not yet a dependency) — currently the
  app shows a plain Dart-drawn "Loan Manager" splash
  (`features/auth/splash_screen.dart`), not a native one, so there's a
  visible flash/transition today worth eliminating.
- "Branding animation" — clarify scope with the user before starting
  (logo animation on splash? a specific micro-interaction?).
- Declare the new assets in `pubspec.yaml`'s `flutter: assets:` section if
  referenced directly in Dart (currently they aren't).

## 3. Dev-DB cleanup (optional, low priority, carried over)
Same duplicate test loan applications from 2026-07-15 remain (one Home
Loan ₹5,00,000, one Business Loan ₹10,00,000, two Personal Loans). Harmless
but worth deleting before demoing so "Recent activity"/"Active
applications" don't look cluttered. Still untouched intentionally.

## 4. Deferred backend/architecture items (carried over from 2026-07-15)
- The Documents-step required-document gate is **client-side only** — the
  backend submit path still has no server-side enforcement that required
  documents exist before a loan application can move to `submitted`. Low
  urgency (one client today), but close before a second consumer of the
  submit endpoint appears (DSA App, admin resubmission, etc.).
- No live-device walkthrough has been done for the **employee-app** side of
  the document catalog — confirm whether it needs the same catalog-aware
  update.
- Admin CRUD for `document_types` and the future `lending_partners` table
  (once built) both have no admin-panel UI yet — flag when Admin Panel work
  starts.
- `GET /v1/lending-partners` doesn't exist yet — `LendingPartnerRepository`
  is fully wired client-side and fails soft to empty today; needs the
  actual table/migration/endpoint from a future Bank Portal/Admin Panel
  sprint. See `WORK_SUMMARY.md` §3 (2026-07-16/17) for the exact shape
  expected.

## 5. Roadmap (per user's stated direction) — unchanged, still not started
Customer App is feature-complete pending final QA/polish. Stated next
phases after Splash Screen/branding work:
1. **DSA App** — loan officer/agent-facing app for sourcing applications.
2. **Bank Portal** — where real partner banks/lenders onboard; also what
   turns Lending Partners from "coming soon" into real data.
3. **Super Admin Panel** — builds on `apps/admin-panel` (React); natural
   home for document-types and lending-partners catalog management UI.

## 6. Known limitations (carried over)
- `apps/customer-app/env/production.json` has `FIREBASE_ENABLED: false`
  with no real project ID — must be a real, configured Firebase project
  before actual production release. Auth is a deliberate no-op without it.
- No automated test coverage beyond one smoke test.
- **CIBIL/credit bureau integration** — Home's "Credit Profile" card uses
  an honest "Profile Strength" meter, not a real score. Separate vendor/
  compliance workstream.
- **Payments/repayment tracking** — loans model disbursement but not
  repayment schedule/collections.
- See `docs/architecture-review-2026-07.md` for the fuller architecture
  backlog.
