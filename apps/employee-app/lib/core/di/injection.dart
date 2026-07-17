import 'package:firebase_auth/firebase_auth.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../auth/employee_auth_repository.dart';
import '../config/env_config.dart';
import '../network/customer_repository.dart';
import '../network/document_repository.dart';
import '../network/loan_application_repository.dart';
import '../network/notification_repository.dart';

/// Dependency injection.
///
/// A manually-wired GetIt container. Deliberately not using
/// code-generated DI (e.g. `injectable`) yet, so the app builds
/// without requiring a `build_runner` codegen step.
///
/// Phase 4: Firebase-dependent services (`FirebaseAuth`,
/// `EmployeeAuthRepository`, `AuthController`) are only registered
/// when `EnvConfig.firebaseEnabled` is true. Phase 5 adds the
/// business-feature repositories (`LoanApplicationRepository`,
/// `CustomerRepository`), registered unconditionally since they only
/// depend on `ApiClient` (always available) — the router already
/// gates the screens that use them behind authentication.
final GetIt getIt = GetIt.instance;

void configureDependencies() {
  if (getIt.isRegistered<AppLogger>()) {
    return; // Avoid double registration (e.g. across hot restarts in tests).
  }

  getIt.registerLazySingleton<AppLogger>(
    () => AppLogger(verbose: EnvConfig.isDevelopment),
  );

  getIt.registerLazySingleton<ApiClient>(
    () => ApiClient(baseUrl: EnvConfig.apiBaseUrl),
  );

  getIt.registerLazySingleton<LoanApplicationRepository>(
    () => LoanApplicationRepository(getIt<ApiClient>()),
  );

  getIt.registerLazySingleton<CustomerRepository>(
    () => CustomerRepository(getIt<ApiClient>()),
  );

  getIt.registerLazySingleton<DocumentRepository>(
    () => DocumentRepository(getIt<ApiClient>()),
  );

  getIt.registerLazySingleton<NotificationRepository>(
    () => NotificationRepository(getIt<ApiClient>()),
  );

  if (EnvConfig.firebaseEnabled) {
    getIt.registerLazySingleton<FirebaseAuth>(() => FirebaseAuth.instance);

    getIt.registerLazySingleton<EmployeeAuthRepository>(
      () => EmployeeAuthRepository(firebaseAuth: getIt<FirebaseAuth>()),
    );

    getIt.registerLazySingleton<AuthController>(
      () => AuthController(
        firebaseAuth: getIt<FirebaseAuth>(),
        apiClient: getIt<ApiClient>(),
        logger: getIt<AppLogger>(),
      ),
    );
  }
}
