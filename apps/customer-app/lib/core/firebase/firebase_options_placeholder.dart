import 'package:firebase_core/firebase_core.dart';

/// Firebase configuration.
///
/// Android values below are taken directly from `android/app/google-services.json`
/// (the same values `flutterfire configure` would generate for Android).
/// No iOS/web client has been registered in the Firebase project yet, so
/// this returns the Android config unconditionally.
class DefaultFirebaseOptions {
  const DefaultFirebaseOptions._();

  static FirebaseOptions get currentPlatform {
    return const FirebaseOptions(
      apiKey: 'AIzaSyBJozwyZKkZUYba_y6yVhUQ9Wkj57hxSCk',
      appId: '1:660520519709:android:21ebd181c8625fdc8edef4',
      messagingSenderId: '660520519709',
      projectId: 'loan-manager-india',
      storageBucket: 'loan-manager-india.firebasestorage.app',
    );
  }
}
