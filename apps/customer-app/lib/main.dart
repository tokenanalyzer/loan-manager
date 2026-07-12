import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_flutter/shared_flutter.dart';

import 'core/app.dart';
import 'core/bootstrap/app_bootstrap_state.dart';
import 'core/di/injection.dart';
import 'core/firebase/firebase_bootstrap.dart';
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

  runApp(const ProviderScope(child: CustomerApp()));
}
