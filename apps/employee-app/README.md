# Loan Manager — Employee App

Flutter application — part of the Loan Manager Enterprise monorepo.

## Status

**Phase 1 (current):** repository foundation only — package structure,
lint/format configuration, and dependency wiring. No UI, authentication,
or business logic has been implemented yet.

## Structure

```
lib/
  core/       # app-wide configuration, constants, routing (Phase 2+)
  features/   # feature modules (Phase 2+)
  shared/     # shared widgets/utilities local to this app (Phase 2+)
```

## Local development

```bash
flutter pub get
flutter analyze
flutter test
```

This app also depends on the local `shared_flutter` package
(`packages/shared-flutter`) for cross-app shared code.
