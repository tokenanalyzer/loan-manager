import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_flutter/shared_flutter.dart';

import 'core/app.dart';
import 'core/di/injection.dart';
import 'core/firebase/firebase_bootstrap.dart';

/// Loan Manager — Employee App
///
/// Application entry point.
///
/// Phase 4 scope: adds Firebase Email/Password Authentication (see
/// `core/auth/employee_auth_repository.dart` and `features/auth/`).
///
/// `configureDependencies()` only *registers* lazy singletons — it
/// doesn't touch `FirebaseAuth.instance` until something actually
/// resolves `AuthController`/`EmployeeAuthRepository`, which only
/// happens after `runApp()` builds the widget tree below.
///
/// Environment is selected at build/run time, e.g.:
///   flutter run --dart-define-from-file=env/development.json
///   flutter run --dart-define-from-file=env/staging.json
///   flutter run --dart-define-from-file=env/production.json
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  configureDependencies();
  final logger = getIt<AppLogger>();

  await initializeFirebase(logger);

  logger.info('Loan Manager — Employee App starting.');

  runApp(const ProviderScope(child: EmployeeApp()));
}
