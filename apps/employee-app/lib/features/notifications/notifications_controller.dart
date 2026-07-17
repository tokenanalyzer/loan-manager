import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/app_notification.dart';
import '../../core/riverpod/providers.dart';

final notificationsProvider =
    FutureProvider.autoDispose<List<AppNotification>>((ref) async {
  final repository = ref.read(notificationRepositoryProvider);
  final result = await repository.getMyNotifications();
  return result.when(success: (data) => data, failure: (error) => throw error);
});

class NotificationsActions {
  NotificationsActions(this._ref);
  final Ref _ref;

  Future<void> markAsRead(String id) async {
    final repository = _ref.read(notificationRepositoryProvider);
    final result = await repository.markAsRead(id);
    result.when(
      success: (_) => _ref.invalidate(notificationsProvider),
      failure: (_) {},
    );
  }
}

final notificationsActionsProvider = Provider.autoDispose<NotificationsActions>(
  (ref) => NotificationsActions(ref),
);
