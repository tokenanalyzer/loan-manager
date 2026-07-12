# Native Setup & Play Store Runbook (Customer App)

This document is the exact, ordered checklist for the production steps
that **require the Flutter toolchain, a real Firebase project, and your
signing keys** — none of which can be generated or verified in the
sandbox where the phased code was written. Everything here is a command
_you_ run locally (or in CI), once.

Nothing in this runbook is a placeholder. Each step produces real,
environment-specific files (Gradle wrappers, native manifests, Firebase
credentials, signing keys) that are intentionally **not** committed by
the phased work because hand-writing them without a toolchain to verify
them would produce a broken build that only _looks_ complete.

> Applies to `apps/customer-app`. The same steps work for
> `apps/employee-app` — substitute the directory and application ID.

---

## 0. Prerequisites (install once)

```bash
# Flutter SDK 3.24.x (matches CI and pubspec constraints)
flutter --version        # confirm 3.24.x, Dart 3.4+
flutter doctor           # resolve any red X's (Android toolchain, cmdline-tools)

# FlutterFire CLI (for Firebase config generation)
dart pub global activate flutterfire_cli
```

---

## 1. Generate the native platform folders

These do not exist in the repo yet. `flutter create` generates them
against your installed SDK/Gradle versions.

```bash
cd apps/customer-app

# Generates android/, ios/, (and web/ if desired) WITHOUT touching
# existing lib/, test/, pubspec.yaml, etc. The --org sets the reverse-DNS
# prefix that becomes part of the applicationId / bundle identifier.
flutter create . \
  --org com.loanmanager \
  --project-name loan_manager_customer_app \
  --platforms=android,ios

# Confirm the app compiles end-to-end now that native code exists.
flutter pub get
flutter analyze .
dart format --set-exit-if-changed .
flutter test
```

After this, the Android application ID will be
`com.loanmanager.loan_manager_customer_app`. If you want the shorter
`com.loanmanager.customer` used by the CD workflow's `packageName`,
edit `android/app/build.gradle` (`applicationId`) and the CD workflow to
match — pick one and keep them identical.

---

## 2. Declare required permissions

`image_picker` (used by the Documents feature) needs camera/photo
permissions that `flutter create` does **not** add.

**Android** — `apps/customer-app/android/app/src/main/AndroidManifest.xml`,
inside `<manifest>` above `<application>`:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
```

**iOS** — `apps/customer-app/ios/Runner/Info.plist`, inside the top `<dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>Take photos of documents to upload with your loan application.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Attach document images from your photo library.</string>
```

---

## 3. Configure Firebase (real credentials)

The repo ships `lib/core/firebase/firebase_options_placeholder.dart`
with **empty** values. The Phase 8 fail-safe guard detects these empties
and refuses to initialize Firebase (logging an actionable error) rather
than crashing opaquely — so the app runs fine with `FIREBASE_ENABLED=false`
until you complete this step.

```bash
cd apps/customer-app

# Interactive: select/create your Firebase project, registers the
# Android + iOS apps, and generates lib/firebase_options.dart plus the
# native config files (android/app/google-services.json,
# ios/Runner/GoogleService-Info.plist).
flutterfire configure \
  --project=YOUR_FIREBASE_PROJECT_ID \
  --out=lib/firebase_options.dart \
  --platforms=android,ios
```

Then point the bootstrap at the real file:

1. In `lib/core/firebase/firebase_bootstrap.dart`, change the import
   from `firebase_options_placeholder.dart` to the generated
   `../../firebase_options.dart`.
2. Delete `lib/core/firebase/firebase_options_placeholder.dart`.
3. Set `FIREBASE_ENABLED=true` in `env/production.json` (and staging).

`google-services.json` and `GoogleService-Info.plist` are already in
`.gitignore` — keep them out of version control; CI injects them from
secrets.

Enable in the Firebase console: **Authentication → Phone** sign-in, and
add your app's SHA-1/SHA-256 (from `./gradlew signingReport`) so phone
auth / Play Integrity works.

---

## 4. Create the upload keystore (signing)

Google Play requires a signed release. Generate an **upload** key
(Play App Signing manages the final app-signing key for you):

```bash
keytool -genkey -v \
  -keystore ~/loan-manager-upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

Wire it into Gradle. Create `apps/customer-app/android/key.properties`
(this file is gitignored — see step 6):

```properties
storePassword=<your keystore password>
keyPassword=<your key password>
keyAlias=upload
storeFile=<absolute path to loan-manager-upload-keystore.jks>
```

In `android/app/build.gradle`, load it above `android { }` and reference
it in a `signingConfigs.release` block applied to `buildTypes.release`
(the standard Flutter signing setup — see the Flutter deployment docs).

---

## 5. Build the release artifact locally (verify before CI)

```bash
cd apps/customer-app
flutter build appbundle --release --dart-define-from-file=env/production.json
# → build/app/outputs/bundle/release/app-release.aab
```

Upload that `.aab` once to the Play Console to create the app listing.

---

## 6. Harden .gitignore for native artifacts

Add to the repo root `.gitignore` (native build outputs and secrets that
`flutter create` / signing produce — must never be committed):

```gitignore
# Flutter/Android/iOS native build artifacts
apps/*/android/.gradle/
apps/*/android/app/debug/
apps/*/android/app/profile/
apps/*/android/app/release/
apps/*/build/
apps/*/.dart_tool/
apps/*/ios/Pods/
apps/*/ios/.symlinks/

# Signing — NEVER commit
apps/*/android/key.properties
**/upload-keystore.jks
**/*.keystore
```

---

## 7. CI/CD secrets (for `.github/workflows/cd-customer-app.yml`)

Add these repository secrets (Settings → Secrets and variables →
Actions). The CD workflow guards on native setup existing and fails with
a clear message if any signing secret is missing.

| Secret                      | How to produce it                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | `base64 -w0 ~/loan-manager-upload-keystore.jks`                                           |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password from step 4                                                             |
| `ANDROID_KEY_ALIAS`         | `upload`                                                                                  |
| `ANDROID_KEY_PASSWORD`      | key password from step 4                                                                  |
| `PLAY_SERVICE_ACCOUNT_JSON` | Play Console → Setup → API access → service account JSON with "Release to testing tracks" |

Trigger a release:

```bash
git tag customer-app-v0.2.0
git push origin customer-app-v0.2.0
# or run the "CD — Customer App" workflow manually, with
# publish_to_play=true to push to the internal testing track.
```

---

## 8. Play Console one-time listing requirements

These are console tasks, not code:

- **Privacy policy URL** (required — the app collects personal/financial
  data and images).
- **Data safety form** — declare: personal info (name, address, income),
  financial info (loan applications), photos (document uploads), and that
  data is encrypted in transit.
- **Content rating questionnaire**.
- **Target audience** — not directed at children (financial product).
- **App access** — provide test credentials, since sign-in is phone-OTP
  gated (reviewers need a way in).

---

## Status summary

| Item                       | State after this runbook                                       |
| -------------------------- | -------------------------------------------------------------- |
| Native android/ios folders | Generated by you (step 1)                                      |
| Camera/photo permissions   | Declared by you (step 2)                                       |
| Firebase real config       | Generated by you (step 3)                                      |
| Release signing            | Configured by you (steps 4–6)                                  |
| CD pipeline                | **Committed in Phase 8** — activates once steps 1/4/7 are done |
| Fail-safe Firebase guard   | **Committed in Phase 8**                                       |
| review() DB transaction    | **Committed in Phase 8**                                       |
