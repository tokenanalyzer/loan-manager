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
    _subscription = _firebaseAuth.authStateChanges().listen(_onAuthStateChanged);
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

    _setState(const AuthSyncing());
    try {
      final idToken = await user.getIdToken();
      if (idToken == null) {
        throw StateError('Firebase returned a null ID token for a signed-in user.');
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
