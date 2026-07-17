import 'dart:async';

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
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  configureDependencies();
  final logger = getIt<AppLogger>();

  await initializeFirebase(logger);

  AppBootstrapState.hasSeenOnboarding =
      await OnboardingRepository().hasSeenOnboarding();

  logger.info('Loan Manager — Customer App starting.');

  // The branding splash animation (`SplashScreen`) always plays for
  // its full duration, however fast Firebase auth resolves — see
  // `AppBootstrapState.splashMinimumElapsed` and the router's
  // redirect gate. `appRouter.refresh()` forces the redirect to
  // re-evaluate at exactly this moment, since nothing else notifies
  // the router when a plain timer (as opposed to an auth-state change)
  // completes.
  Timer(kSplashAnimationDuration, () {
    AppBootstrapState.splashMinimumElapsed = true;
    appRouter.refresh();
  });

  runApp(const ProviderScope(child: CustomerApp()));
}
