import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_flutter/shared_flutter.dart';

import 'core/app.dart';
import 'core/bootstrap/app_bootstrap_state.dart';
import 'core/constants/splash_constants.dart';
import 'core/di/injection.dart';
import 'core/firebase/firebase_bootstrap.dart';
import 'core/router/app_router.dart';
import 'features/auth/onboarding_repository.dart';

/// Loan Manager — Customer App
///
/// Application entry point.
///
/// Phase 6 loads the "has seen onboarding" flag into
/// `AppBootstrapState` before `runApp()`, so the router's `redirect`
/// can read it synchronously on every navigation without re-hitting
/// SharedPreferences each time.
///
/// Stability hardening: everything runs inside `runZonedGuarded` so an
/// otherwise-uncaught async error can never silently kill the isolate
/// with no trace; `FlutterError.onError`/`ErrorWidget.builder` log
/// framework/build errors instead of only printing to the console; and
/// each bootstrap step that can fail (Firebase init, reading the
/// onboarding flag from `SharedPreferences`) is individually
/// try/caught with a safe fallback so one flaky step never prevents
/// `runApp` from ever being called.
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

    try {
      AppBootstrapState.hasSeenOnboarding =
          await OnboardingRepository().hasSeenOnboarding();
    } catch (error, stackTrace) {
      logger.error(
          'Failed to read the onboarding flag — defaulting to not-seen.', error, stackTrace);
      AppBootstrapState.hasSeenOnboarding = false;
    }

    logger.info('Loan Manager — Customer App starting.');

    // The branding splash animation (`SplashScreen`) always plays for
    // its full duration, however fast Firebase auth resolves — see
    // `AppBootstrapState.splashMinimumElapsed` and the router's
    // redirect gate. `appRouter.refresh()` forces the redirect to
    // re-evaluate at exactly this moment, since nothing else notifies
    // the router when a plain timer (as opposed to an auth-state change)
    // completes.
    //
    // Reproduced live (repeated crash-loop on cold start with an
    // already-signed-in session): Firebase resolving right around this
    // same moment fires `AuthController`'s own `refreshListenable`
    // notification, which can land in the same frame as this timer's
    // `refresh()` call — GoRouter then runs two overlapping
    // redirect/rebuild passes for the same splash→home transition,
    // producing two Navigator pages with an identical key ("Failed
    // assertion: '!keyReservation.contains(key)' is not true", then a
    // null-check crash in `GoRouterDelegate._findCurrentNavigator` on
    // the next back-press since the page stack was left inconsistent).
    // Deferring to a post-frame callback — and skipping the call
    // entirely if the auth-triggered redirect already navigated us off
    // `/splash` — keeps this a single redirect pass either way.
    Timer(kSplashAnimationDuration, () {
      AppBootstrapState.splashMinimumElapsed = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (appRouter.routerDelegate.currentConfiguration.uri.path == '/splash') {
          appRouter.refresh();
        }
      });
    });

    runApp(const ProviderScope(child: CustomerApp()));
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
/// (debug keeps Flutter's normal red error screen, since that's more
/// useful mid-development) — small and self-contained so it can never
/// itself throw while rendering.
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
