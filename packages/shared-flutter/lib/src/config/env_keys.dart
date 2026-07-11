/// Shared environment variable **key names** (not values) used by both
/// Flutter apps, so a typo in one app's `.env` handling can't silently
/// diverge from the other's.
abstract final class EnvKeys {
  static const String apiBaseUrl = 'API_BASE_URL';
  static const String appEnv = 'APP_ENV';
  static const String firebaseEnabled = 'FIREBASE_ENABLED';
  static const String firebaseProjectId = 'FIREBASE_PROJECT_ID';
}
