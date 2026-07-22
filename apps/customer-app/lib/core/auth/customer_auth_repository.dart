import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

/// Wraps Firebase Phone Authentication and Google Sign-In for the
/// Customer App.
///
/// This only *initiates* sign-in. The shared `AuthController` (from
/// `shared_flutter`) reacts to the resulting Firebase auth-state
/// change and handles backend session sync — this repository never
/// calls the backend directly.
class CustomerAuthRepository {
  CustomerAuthRepository({
    required FirebaseAuth firebaseAuth,
    GoogleSignIn? googleSignIn,
  })  : _firebaseAuth = firebaseAuth,
        _googleSignIn = googleSignIn ?? GoogleSignIn();

  final FirebaseAuth _firebaseAuth;
  final GoogleSignIn _googleSignIn;

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

  /// Runs the Google federated sign-in flow and exchanges the resulting
  /// Google credential for a Firebase session.
  ///
  /// Returns `false` if the user cancels the Google account picker
  /// (not an error). On success, Firebase's own auth-state stream
  /// fires and the shared `AuthController` takes over, same as
  /// [verifyOtp].
  ///
  /// Signs out of the cached native Google session first — without
  /// this, `GoogleSignIn.signIn()` silently re-authenticates whichever
  /// account was used last (Android caches it), skipping the account
  /// picker entirely even when the device has several Google accounts.
  /// This forces the picker every time, matching Gmail/YouTube/Play's
  /// "always let the user choose" behavior rather than silently
  /// re-signing into a stale account.
  Future<bool> signInWithGoogle() async {
    await _googleSignIn.signOut();
    final googleUser = await _googleSignIn.signIn();
    if (googleUser == null) {
      return false;
    }

    final googleAuth = await googleUser.authentication;
    final credential = GoogleAuthProvider.credential(
      accessToken: googleAuth.accessToken,
      idToken: googleAuth.idToken,
    );
    await _firebaseAuth.signInWithCredential(credential);
    return true;
  }

  /// The sign-in providers already linked to the *currently signed-in*
  /// user — `'phone'` and/or `'google.com'` (Firebase's own provider
  /// IDs). Empty if nobody is signed in.
  List<String> get linkedProviderIds =>
      _firebaseAuth.currentUser?.providerData
          .map((info) => info.providerId)
          .toList() ??
      const [];

  /// Links a Google account to the *currently signed-in* user, instead
  /// of starting a fresh sign-in — this is what keeps "signed in with
  /// phone" and "signed in with Google" resolving to the same backend
  /// account (see `AuthService.syncFromFirebaseToken`'s backfill logic)
  /// rather than [signInWithGoogle]'s plain sign-in silently creating a
  /// second, disconnected Firebase user for the same person.
  ///
  /// Returns `false` if the user cancels the Google account picker (not
  /// an error). Throws the underlying [FirebaseAuthException] on
  /// failure — in particular `credential-already-in-use` when that
  /// Google account is already the *other* end of a different,
  /// unrelated Firebase user; callers should surface that distinctly
  /// rather than as a generic failure.
  Future<bool> linkGoogleAccount() async {
    final current = _firebaseAuth.currentUser;
    if (current == null) {
      throw StateError('linkGoogleAccount requires a signed-in user.');
    }

    // See signInWithGoogle's doc comment — forces the account picker
    // instead of silently reusing a cached session.
    await _googleSignIn.signOut();
    final googleUser = await _googleSignIn.signIn();
    if (googleUser == null) {
      return false;
    }

    final googleAuth = await googleUser.authentication;
    final credential = GoogleAuthProvider.credential(
      accessToken: googleAuth.accessToken,
      idToken: googleAuth.idToken,
    );
    await current.linkWithCredential(credential);
    return true;
  }

  /// Sends an OTP to link [phoneNumber] to the *currently signed-in*
  /// user (see [linkGoogleAccount] for why this matters). Mirrors
  /// [sendOtp]'s shape but is kept as a separate method rather than a
  /// branch inside it, so the already-verified plain sign-in path is
  /// never touched by this addition.
  Future<void> sendOtpToLink({
    required String phoneNumber,
    required void Function(String verificationId) onCodeSent,
    required void Function(String message) onVerificationFailed,
  }) {
    final current = _firebaseAuth.currentUser;
    if (current == null) {
      throw StateError('sendOtpToLink requires a signed-in user.');
    }

    return _firebaseAuth.verifyPhoneNumber(
      phoneNumber: phoneNumber,
      timeout: const Duration(seconds: 60),
      verificationCompleted: (PhoneAuthCredential credential) async {
        await current.linkWithCredential(credential);
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

  /// Completes [sendOtpToLink] with the entered OTP. Throws the
  /// underlying [FirebaseAuthException] on failure — in particular
  /// `credential-already-in-use` when that phone number already
  /// belongs to a different Firebase user.
  Future<void> linkPhoneNumber(
      {required String verificationId, required String smsCode}) async {
    final current = _firebaseAuth.currentUser;
    if (current == null) {
      throw StateError('linkPhoneNumber requires a signed-in user.');
    }

    final credential = PhoneAuthProvider.credential(
      verificationId: verificationId,
      smsCode: smsCode,
    );
    await current.linkWithCredential(credential);
  }

  /// Signs out of both Firebase *and* the native Google session. The
  /// Google half matters even though Firebase sign-out alone ends the
  /// app session: without it, `GoogleSignIn` keeps its cached account
  /// silently selected, so the next "Continue with Google" tap would
  /// skip the account picker and re-sign into the same account the
  /// customer just signed out of — required behavior is that logout
  /// always resets to a fresh account picker.
  Future<void> signOut() async {
    await Future.wait([
      _firebaseAuth.signOut(),
      _googleSignIn.signOut(),
    ]);
  }
}
