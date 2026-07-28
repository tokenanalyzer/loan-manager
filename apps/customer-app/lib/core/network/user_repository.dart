import 'package:shared_flutter/shared_flutter.dart';

import '../models/user_profile.dart';

/// Wraps the existing `GET /v1/auth/me` endpoint (built in Phase 4,
/// never previously consumed by this app — the Home dashboard's user
/// greeting is the first real caller).
class UserRepository extends BaseRepository {
  UserRepository(super.apiClient);

  Future<ApiResult<UserProfile>> getMe() {
    return get<UserProfile>(
      '/v1/auth/me',
      mapper: (data) => UserProfile.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Registers/refreshes this device's FCM token — idempotent, safe to
  /// call on every app foreground and on `onTokenRefresh`.
  Future<ApiResult<void>> updateDeviceToken(String token) {
    return post<void>(
      '/v1/auth/me/device-token',
      body: {'token': token},
      mapper: (_) {},
    );
  }
}
