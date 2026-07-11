import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../auth/customer_auth_repository.dart';
import '../di/injection.dart';
import '../network/customer_profile_repository.dart';
import '../network/loan_application_repository.dart';
import '../network/document_repository.dart';
import '../network/notification_repository.dart';
import '../network/user_repository.dart';

/// Bridge between GetIt (the service locator established in Phase 2)
/// and Riverpod (the reactive UI-state layer added in Phase 6).
///
/// These providers do *not* construct new instances — they return the
/// exact same singletons GetIt already manages, so there is only ever
/// one `ApiClient`, one `AuthController`, etc. This is the reconciling
/// design decision for "use Riverpod" + "use the existing AuthService/
/// repositories" + "no duplicated code" all being required at once:
/// Riverpod adds reactivity (`ref.watch`, auto-rebuild, `Notifier`
/// composition) on top of, not instead of, the existing DI.
final apiClientProvider = Provider<ApiClient>((ref) => getIt<ApiClient>());

final appLoggerProvider = Provider<AppLogger>((ref) => getIt<AppLogger>());

final loanApplicationRepositoryProvider = Provider<LoanApplicationRepository>(
  (ref) => getIt<LoanApplicationRepository>(),
);

final customerProfileRepositoryProvider = Provider<CustomerProfileRepository>(
  (ref) => getIt<CustomerProfileRepository>(),
);

final documentRepositoryProvider = Provider<DocumentRepository>(
  (ref) => getIt<DocumentRepository>(),
);

final notificationRepositoryProvider = Provider<NotificationRepository>(
  (ref) => getIt<NotificationRepository>(),
);

final userRepositoryProvider = Provider<UserRepository>((ref) => getIt<UserRepository>());

/// `AuthController` is only registered in GetIt when
/// `EnvConfig.firebaseEnabled` is true (see `core/di/injection.dart`).
/// This provider mirrors that guard rather than throwing when Firebase
/// isn't configured.
final authControllerProvider = ChangeNotifierProvider<AuthController?>((ref) {
  return getIt.isRegistered<AuthController>() ? getIt<AuthController>() : null;
});

final customerAuthRepositoryProvider = Provider<CustomerAuthRepository?>((ref) {
  return getIt.isRegistered<CustomerAuthRepository>() ? getIt<CustomerAuthRepository>() : null;
});
