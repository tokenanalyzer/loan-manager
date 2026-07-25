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

/// Firebase's cached credential is still considered valid, but the most
/// recent attempt to sync it with the backend (or refresh the Firebase
/// token itself) failed for a *transport* reason — timeout, no
/// connection, DNS, a backend 5xx — rather than a confirmed 401/403 or
/// an invalid Firebase session. Callers should treat this like
/// [AuthAuthenticated] for access purposes (nothing has actually
/// invalidated the session) rather than routing back to sign-in, since
/// the network simply isn't cooperating right now.
final class AuthOffline extends AuthState {
  const AuthOffline({required this.uid});

  final String uid;
}
