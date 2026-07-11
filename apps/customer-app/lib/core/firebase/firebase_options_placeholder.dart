import 'package:firebase_core/firebase_core.dart';

/// Firebase placeholder configuration.
///
/// Phase 2 scope: mirrors the shape FlutterFire CLI generates
/// (`firebase_options.dart`), but with empty placeholder values. Run
/// `flutterfire configure` for this app once a real Firebase project
/// exists, which will generate a proper platform-specific file to
/// replace this one — no Authentication/Storage/Messaging usage is
/// implemented yet regardless.
class DefaultFirebaseOptions {
  const DefaultFirebaseOptions._();

  static FirebaseOptions get currentPlatform {
    return const FirebaseOptions(
      apiKey: '',
      appId: '',
      messagingSenderId: '',
      projectId: '',
      storageBucket: '',
    );
  }
}
