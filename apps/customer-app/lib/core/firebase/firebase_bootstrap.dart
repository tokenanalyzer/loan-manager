import 'package:firebase_core/firebase_core.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../config/env_config.dart';
import 'firebase_options_placeholder.dart';

/// Guarded Firebase bootstrap.
///
/// Initializes the Firebase app *only* when [EnvConfig.firebaseEnabled]
/// is true and real options have been configured. Defaults to a no-op
/// so the app still builds and runs without a real Firebase project.
///
/// Phase 8 hardening: if Firebase is enabled but the options are still
/// the empty placeholder values (i.e. `flutterfire configure` hasn't
/// been run for a real project yet), this now logs a clear, explicit
/// error and skips initialization — instead of calling
/// `Firebase.initializeApp` with blank credentials and failing with an
/// opaque platform error. This is the difference between a build that
/// fails loudly with an actionable message and one that crashes
/// mysteriously on first launch.
Future<void> initializeFirebase(AppLogger logger) async {
  if (!EnvConfig.firebaseEnabled) {
    logger.info('Firebase disabled (FIREBASE_ENABLED=false) — skipping initialization.');
    return;
  }

  final options = DefaultFirebaseOptions.currentPlatform;
  if (!_optionsAreConfigured(options)) {
    logger.error(
      'FIREBASE_ENABLED=true but Firebase options are unconfigured (empty placeholder '
      'values). Run `flutterfire configure` to generate a real firebase_options.dart, '
      'then replace lib/core/firebase/firebase_options_placeholder.dart. Skipping '
      'initialization to avoid an opaque runtime crash.',
    );
    return;
  }

  try {
    await Firebase.initializeApp(options: options);
    logger.info('Firebase initialized.');
  } catch (error, stackTrace) {
    logger.error('Firebase initialization failed.', error, stackTrace);
  }
}

/// The placeholder ships with empty strings for the critical fields.
/// A real FlutterFire-generated config always populates them.
bool _optionsAreConfigured(FirebaseOptions options) {
  return options.apiKey.isNotEmpty &&
      options.appId.isNotEmpty &&
      options.projectId.isNotEmpty;
}
