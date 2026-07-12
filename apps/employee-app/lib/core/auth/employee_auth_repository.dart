import 'package:firebase_auth/firebase_auth.dart';

/// Wraps Firebase Email/Password Authentication for the Employee App.
///
/// This only *initiates* sign-in. The shared `AuthController` (from
/// `shared_flutter`) reacts to the resulting Firebase auth-state
/// change and handles backend session sync — this repository never
/// calls the backend directly.
///
/// Employee accounts are expected to be pre-provisioned (email +
/// initial password issued out-of-band) — this repository has no
/// self-service sign-up method, only sign-in.
class EmployeeAuthRepository {
  EmployeeAuthRepository({required FirebaseAuth firebaseAuth})
      : _firebaseAuth = firebaseAuth;

  final FirebaseAuth _firebaseAuth;

  /// Throws [FirebaseAuthException] on invalid credentials — the
  /// caller (LoginScreen) is responsible for presenting a
  /// human-readable message.
  Future<void> signIn({required String email, required String password}) {
    return _firebaseAuth.signInWithEmailAndPassword(
        email: email, password: password);
  }

  Future<void> sendPasswordResetEmail(String email) {
    return _firebaseAuth.sendPasswordResetEmail(email: email);
  }

  Future<void> signOut() => _firebaseAuth.signOut();
}
