import 'package:shared_flutter/shared_flutter.dart';

/// Environment configuration.
///
/// Values are baked in at compile time via `--dart-define-from-file`
/// (see `env/development.json`, `env/staging.json`, `env/production.json`).
/// Sensible defaults are provided so the app still compiles and runs
/// correctly with zero flags (defaulting to local development).
///
/// Key *names* come from the shared [EnvKeys] constants so both Flutter
/// apps read environment variables under identical names.
abstract final class EnvConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    EnvKeys.apiBaseUrl,
    defaultValue: 'http://localhost:3000/api',
  );

  static const String appEnv = String.fromEnvironment(
    EnvKeys.appEnv,
    defaultValue: 'development',
  );

  static const bool firebaseEnabled = bool.fromEnvironment(
    EnvKeys.firebaseEnabled,
  );

  static const String firebaseProjectId = String.fromEnvironment(
    EnvKeys.firebaseProjectId,
    defaultValue: '',
  );

  static bool get isProduction => appEnv == 'production';
  static bool get isDevelopment => appEnv == 'development';
}
