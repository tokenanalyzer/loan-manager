import 'package:firebase_auth/firebase_auth.dart';

/// Wraps Firebase Phone Authentication for the Customer App.
///
/// This only *initiates* sign-in. The shared `AuthController` (from
/// `shared_flutter`) reacts to the resulting Firebase auth-state
/// change and handles backend session sync — this repository never
/// calls the backend directly.
class CustomerAuthRepository {
  CustomerAuthRepository({required FirebaseAuth firebaseAuth})
      : _firebaseAuth = firebaseAuth;

  final FirebaseAuth _firebaseAuth;

  /// Sends an OTP SMS to [phoneNumber] (expected in E.164 format, e.g.
  /// "+15551234567").
  ///
  /// [onCodeSent] receives the `verificationId` needed by [verifyOtp].
  /// [onVerificationFailed] surfaces a human-readable error message.
  /// [onAutoVerified] fires only on Android, when the OS auto-detects
  /// and verifies the SMS without the user entering a code.
  Future<void> sendOtp({
    required String phoneNumber,
    required void Function(String verificationId) onCodeSent,
    required void Function(String message) onVerificationFailed,
    void Function()? onAutoVerified,
  }) {
    return _firebaseAuth.verifyPhoneNumber(
      phoneNumber: phoneNumber,
      timeout: const Duration(seconds: 60),
      verificationCompleted: (PhoneAuthCredential credential) async {
        await _firebaseAuth.signInWithCredential(credential);
        onAutoVerified?.call();
      },
      verificationFailed: (FirebaseAuthException error) {
        onVerificationFailed(error.message ?? 'Phone verification failed.');
      },
      codeSent: (String verificationId, int? resendToken) {
        onCodeSent(verificationId);
      },
      codeAutoRetrievalTimeout: (String verificationId) {},
    );
  }

  /// Completes sign-in with the OTP [smsCode] and the `verificationId`
  /// obtained from [sendOtp]'s `onCodeSent` callback.
  Future<void> verifyOtp(
      {required String verificationId, required String smsCode}) async {
    final credential = PhoneAuthProvider.credential(
      verificationId: verificationId,
      smsCode: smsCode,
    );
    await _firebaseAuth.signInWithCredential(credential);
  }

  Future<void> signOut() => _firebaseAuth.signOut();
}
