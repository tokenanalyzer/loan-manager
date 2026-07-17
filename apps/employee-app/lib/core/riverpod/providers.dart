import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../auth/employee_auth_repository.dart';
import '../di/injection.dart';
import '../network/customer_repository.dart';
import '../network/document_repository.dart';
import '../network/loan_application_repository.dart';
import '../network/notification_repository.dart';

/// Bridge between GetIt (the service locator) and Riverpod (the
/// reactive UI-state layer) — mirrors the Customer App's
/// `core/riverpod/providers.dart`. These providers don't construct new
/// instances, they return the exact same GetIt singletons, so Riverpod
/// adds reactivity on top of, not instead of, the existing DI.
final apiClientProvider = Provider<ApiClient>((ref) => getIt<ApiClient>());

final appLoggerProvider = Provider<AppLogger>((ref) => getIt<AppLogger>());

final loanApplicationRepositoryProvider = Provider<LoanApplicationRepository>(
  (ref) => getIt<LoanApplicationRepository>(),
);

final customerRepositoryProvider = Provider<CustomerRepository>(
  (ref) => getIt<CustomerRepository>(),
);

final documentRepositoryProvider = Provider<DocumentRepository>(
  (ref) => getIt<DocumentRepository>(),
);

final notificationRepositoryProvider = Provider<NotificationRepository>(
  (ref) => getIt<NotificationRepository>(),
);

/// `AuthController`/`EmployeeAuthRepository` are only registered in
/// GetIt when `EnvConfig.firebaseEnabled` is true (see
/// `core/di/injection.dart`) — these providers mirror that guard
/// rather than throwing when Firebase isn't configured.
final authControllerProvider = ChangeNotifierProvider<AuthController?>((ref) {
  return getIt.isRegistered<AuthController>() ? getIt<AuthController>() : null;
});

final employeeAuthRepositoryProvider = Provider<EmployeeAuthRepository?>((ref) {
  return getIt.isRegistered<EmployeeAuthRepository>()
      ? getIt<EmployeeAuthRepository>()
      : null;
});
