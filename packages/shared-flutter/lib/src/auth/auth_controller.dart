import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../logging/app_logger.dart';
import '../network/api_client.dart';
import 'auth_state.dart';

/// Shared authentication controller.
///
/// Listens to Firebase's own auth-state stream and reacts to it —
/// syncing the resulting ID token with the backend (`POST
/// /v1/auth/session`) and exposing a simple [AuthState] the UI can
/// react to. It does **not** initiate sign-in itself: each app is
/// responsible for that (phone/OTP for the Customer App,
/// email/password for the Employee App), by calling [FirebaseAuth]
/// directly and letting this controller react to the result.
class AuthController extends ChangeNotifier {
  AuthController({
    required FirebaseAuth firebaseAuth,
    required ApiClient apiClient,
    required AppLogger logger,
  })  : _firebaseAuth = firebaseAuth,
        _apiClient = apiClient,
        _logger = logger {
    // `userChanges()` rather than `authStateChanges()`: the latter only
    // fires on sign-in/sign-out, but linking a second provider to the
    // *current* user (see `CustomerAuthRepository.linkGoogleAccount` /
    // `linkPhoneNumber`) doesn't change the signed-in/out state or the
    // uid — it's a user-profile change, which only `userChanges()`
    // emits. `userChanges()` is a documented superset of
    // `authStateChanges()` (sign-in, sign-out, token refresh, *and*
    // profile/provider changes), so this is strictly more correct, not
    // a behavior change for the existing sign-in/out paths.
    _subscription = _firebaseAuth.userChanges().listen(_onAuthStateChanged);
  }

  final FirebaseAuth _firebaseAuth;
  final ApiClient _apiClient;
  final AppLogger _logger;
  late final StreamSubscription<User?> _subscription;

  AuthState _state = const AuthInitial();
  AuthState get state => _state;

  Future<void> _onAuthStateChanged(User? user) async {
    if (user == null) {
      _apiClient.clearAuthTokenProvider();
      _setState(const AuthUnauthenticated());
      return;
    }

    // Only surface the transient "syncing" state for a genuine cold
    // start / sign-in — not for a same-user token refresh (Firebase's
    // own periodic renewal, or a retry after an App Check/Play
    // Integrity hiccup, both observed repeatedly in this app).
    // Reproduced live: emitting AuthSyncing then immediately
    // AuthAuthenticated again on every refresh fires this controller's
    // `notifyListeners()` twice in quick succession, each independently
    // triggering go_router's `refreshListenable`-driven redirect —
    // close enough together to leave two Navigator pages with an
    // identical key ("Failed assertion:
    // '!keyReservation.contains(key)' is not true"). Skipping the
    // redundant interstitial state for an unchanged user removes the
    // race instead of trying to out-time it.
    final currentState = _state;
    final isSameUserRefresh =
        currentState is AuthAuthenticated && currentState.uid == user.uid;
    if (!isSameUserRefresh) {
      _setState(const AuthSyncing());
    }
    try {
      final idToken = await user.getIdToken();
      if (idToken == null) {
        throw StateError(
            'Firebase returned a null ID token for a signed-in user.');
      }

      _apiClient.setAuthTokenProvider(() async => user.getIdToken());

      // Sync the verified Firebase identity with our backend's `users`
      // table. See AuthService.syncFromFirebaseToken (backend) for why
      // this never lets the client specify its own role.
      final result = await _apiClient.request<void>(
        (dio) => dio.post('/v1/auth/session'),
        mapper: (_) {},
      );

      result.when(
        success: (_) {
          _logger.info('Session synced for uid=${user.uid}');
          _setState(AuthAuthenticated(uid: user.uid, idToken: idToken));
        },
        failure: (error) {
          _logger.error('Session sync failed', error);
          _setState(AuthError(error.message));
        },
      );
    } catch (error, stackTrace) {
      _logger.error('Auth state handling failed', error, stackTrace);
      _setState(AuthError(error.toString()));
    }
  }

  Future<void> signOut() => _firebaseAuth.signOut();

  /// Deterministically re-runs the same sync [userChanges] would
  /// eventually trigger on its own. Callers that just linked a second
  /// sign-in provider (see `CustomerAuthRepository.linkGoogleAccount` /
  /// `linkPhoneNumber`) await this immediately afterward instead of
  /// racing the `userChanges` stream — the newly-linked email/phone
  /// needs to reach the backend (and this controller's [state]) before
  /// the caller refetches profile data, not "eventually."
  Future<void> refreshSession() => _onAuthStateChanged(_firebaseAuth.currentUser);

  void _setState(AuthState newState) {
    _state = newState;
    notifyListeners();
  }

  @override
  void dispose() {
    unawaited(_subscription.cancel());
    super.dispose();
  }
}
