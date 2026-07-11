import 'package:shared_flutter/shared_flutter.dart';

import '../models/app_notification.dart';

class NotificationRepository extends BaseRepository {
  NotificationRepository(super.apiClient);

  Future<ApiResult<List<AppNotification>>> getMyNotifications() {
    return get<List<AppNotification>>(
      '/v1/notifications',
      mapper: (data) => (data as List<dynamic>)
          .map((item) => AppNotification.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<ApiResult<AppNotification>> markAsRead(String id) {
    return apiClient.request<AppNotification>(
      (dio) => dio.patch('/v1/notifications/$id/read'),
      mapper: (data) => AppNotification.fromJson(data as Map<String, dynamic>),
    );
  }
}
