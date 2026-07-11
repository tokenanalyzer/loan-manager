import 'package:firebase_core/firebase_core.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../config/env_config.dart';
import 'firebase_options_placeholder.dart';

/// Guarded Firebase bootstrap.
///
/// Phase 2 scope: initializes the Firebase app *only* when
/// [EnvConfig.firebaseEnabled] is true and real options have been
/// configured. Defaults to a no-op so the app still builds and runs
/// without a real Firebase project — Authentication, Storage, and
/// Messaging usage are implemented in a later phase.
Future<void> initializeFirebase(AppLogger logger) async {
  if (!EnvConfig.firebaseEnabled) {
    logger.info('Firebase disabled (FIREBASE_ENABLED=false) — skipping initialization.');
    return;
  }

  try {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    logger.info('Firebase initialized.');
  } catch (error, stackTrace) {
    logger.error('Firebase initialization failed.', error, stackTrace);
  }
}
