/// Authentication state shared by both Flutter apps.
///
/// A sealed class rather than a single enum + nullable fields, so
/// callers must handle every state explicitly (e.g. via a `switch`).
sealed class AuthState {
  const AuthState();
}

/// Before the first Firebase auth-state event has been received.
final class AuthInitial extends AuthState {
  const AuthInitial();
}

final class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

/// Firebase reported a signed-in user; backend session sync in progress.
final class AuthSyncing extends AuthState {
  const AuthSyncing();
}

final class AuthAuthenticated extends AuthState {
  const AuthAuthenticated({required this.uid, required this.idToken});

  final String uid;
  final String idToken;
}

final class AuthError extends AuthState {
  const AuthError(this.message);

  final String message;
}
