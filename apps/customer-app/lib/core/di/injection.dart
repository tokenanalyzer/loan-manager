import 'package:firebase_auth/firebase_auth.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../auth/customer_auth_repository.dart';
import '../config/env_config.dart';
import '../network/customer_profile_repository.dart';
import '../network/document_repository.dart';
import '../network/lending_partner_repository.dart';
import '../network/loan_application_repository.dart';
import '../network/notification_repository.dart';
import '../network/reward_repository.dart';
import '../network/user_repository.dart';

/// Dependency injection.
///
/// A manually-wired GetIt container — the single source of truth for
/// service/repository *construction*. Phase 6 adds Riverpod
/// (`core/riverpod/providers.dart`) as a reactive *consumption* layer
/// on top of these same instances; GetIt itself is unchanged in kind
/// from Phase 2-5, just with more registrations.
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

  getIt.registerLazySingleton<CustomerProfileRepository>(
    () => CustomerProfileRepository(getIt<ApiClient>()),
  );

  getIt.registerLazySingleton<DocumentRepository>(
    () => DocumentRepository(getIt<ApiClient>()),
  );

  getIt.registerLazySingleton<LendingPartnerRepository>(
    () => LendingPartnerRepository(getIt<ApiClient>()),
  );

  getIt.registerLazySingleton<NotificationRepository>(
    () => NotificationRepository(getIt<ApiClient>()),
  );

  getIt.registerLazySingleton<UserRepository>(
    () => UserRepository(getIt<ApiClient>()),
  );

  getIt.registerLazySingleton<RewardRepository>(
    () => RewardRepository(getIt<ApiClient>()),
  );

  if (EnvConfig.firebaseEnabled) {
    getIt.registerLazySingleton<FirebaseAuth>(() => FirebaseAuth.instance);

    getIt.registerLazySingleton<CustomerAuthRepository>(
      () => CustomerAuthRepository(firebaseAuth: getIt<FirebaseAuth>()),
    );

    getIt.registerLazySingleton<AuthController>(
      () => AuthController(
        firebaseAuth: getIt<FirebaseAuth>(),
        apiClient: getIt<ApiClient>(),
        logger: getIt<AppLogger>(),
      ),
    );

    // A genuine 401 (expired/invalid Firebase session) signs the user
    // out so the router's existing redirect sends them cleanly back to
    // `/login`, instead of leaving whatever screen made the request
    // stuck on a dead error state.
    getIt<ApiClient>().setUnauthorizedHandler(
      () => getIt<CustomerAuthRepository>().signOut(),
    );
  }
}
