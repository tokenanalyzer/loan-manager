import 'dart:async';

import 'package:flutter/foundation.dart';
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
///
/// Stability hardening: mirrors the Customer App's `main.dart` — the
/// whole bootstrap runs inside `runZonedGuarded` so an uncaught async
/// error can't silently kill the isolate, `FlutterError.onError`/
/// `ErrorWidget.builder` log framework/build errors instead of only
/// printing them, and Firebase init is individually try/caught so a
/// flaky step never prevents `runApp` from being called.
void main() {
  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    FlutterError.onError = (details) {
      FlutterError.presentError(details);
      _logUncaughtError('Flutter framework error', details.exception, details.stack);
    };

    final previousErrorBuilder = ErrorWidget.builder;
    ErrorWidget.builder = (details) {
      _logUncaughtError('Widget build error', details.exception, details.stack);
      if (kDebugMode) return previousErrorBuilder(details);
      return const _FriendlyErrorFallback();
    };

    configureDependencies();
    final logger = getIt<AppLogger>();

    try {
      await initializeFirebase(logger);
    } catch (error, stackTrace) {
      logger.error('Firebase initialization threw unexpectedly.', error, stackTrace);
    }

    logger.info('Loan Manager — Employee App starting.');

    runApp(const ProviderScope(child: EmployeeApp()));
  }, (error, stackTrace) {
    _logUncaughtError('Uncaught zone error', error, stackTrace);
  });
}

/// Logs via [AppLogger] when DI has succeeded; falls back to
/// `debugPrint` if the error happened before/during
/// `configureDependencies()` itself, so logging an error can never
/// throw a second error.
void _logUncaughtError(String message, Object error, StackTrace? stackTrace) {
  try {
    getIt<AppLogger>().error(message, error, stackTrace);
  } catch (_) {
    debugPrint('$message: $error\n$stackTrace');
  }
}

/// Shown in place of a crashed widget in release/profile builds only
/// (debug keeps Flutter's normal red error screen) — small and
/// self-contained so it can never itself throw while rendering.
class _FriendlyErrorFallback extends StatelessWidget {
  const _FriendlyErrorFallback();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: Colors.white,
      child: Center(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text(
            'Something went wrong displaying this.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.black54),
          ),
        ),
      ),
    );
  }
}
