/// shared_flutter
///
/// Shared Dart/Flutter foundation used by both the Customer App and
/// Employee App: theming, the API client + repository pattern, and a
/// shared logger.
///
/// Phase 2 scope: cross-cutting infrastructure only. No screens,
/// domain models, or business logic are exported here.
library shared_flutter;

export 'src/auth/auth_controller.dart';
export 'src/auth/auth_state.dart';
export 'src/config/env_keys.dart';
export 'src/logging/app_logger.dart';
export 'src/network/api_client.dart';
export 'src/network/api_result.dart';
export 'src/network/network_exception.dart';
export 'src/repository/base_repository.dart';
export 'src/theme/app_colors.dart';
export 'src/theme/app_text_styles.dart';
export 'src/theme/app_theme.dart';
