import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

/// Registered via `FirebaseMessaging.onBackgroundMessage` in
/// `firebase_bootstrap.dart`. Must be a top-level (or static) function
/// — FCM runs it in a separate background isolate with no access to
/// the main isolate's state (DI container, Riverpod, GetIt), so this
/// can't reach any of the app's usual services.
///
/// Deliberately minimal: Android already renders the system-tray
/// notification for a `notification`-payload message while the app is
/// backgrounded/terminated — that's native FCM SDK behavior, not
/// something this handler needs to do. Registering *some* handler is
/// still required by the FCM API contract for background delivery to
/// work at all; `Firebase.initializeApp()` is safe to call again here
/// (idempotent) since the background isolate hasn't run the app's own
/// bootstrap.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}
