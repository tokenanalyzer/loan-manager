/// shared_flutter
///
/// Shared Dart/Flutter foundation used by both the Customer App and
/// Employee App: theming, the API client + repository pattern, a
/// shared logger, and currency/date/EMI formatting utilities.
///
/// Phase 2 scope: cross-cutting infrastructure only. No screens,
/// domain models, or business logic are exported here.
library shared_flutter;

export 'src/auth/auth_controller.dart';
export 'src/auth/auth_state.dart';
export 'src/config/env_keys.dart';
export 'src/logging/app_logger.dart';
export 'src/models/loan_category.dart';
export 'src/network/api_client.dart';
export 'src/network/api_result.dart';
export 'src/network/network_exception.dart';
export 'src/repository/base_repository.dart';
export 'src/theme/app_colors.dart';
export 'src/theme/app_text_styles.dart';
export 'src/theme/app_theme.dart';
export 'src/utils/eligibility_calculator.dart';
export 'src/utils/emi_calculator.dart';
export 'src/utils/formatters.dart';
export 'src/utils/loan_cost_breakdown.dart';
export 'src/widgets/status_badge.dart';
