import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:shared_flutter/shared_flutter.dart';

import '../../core/models/app_notification.dart';
import '../../core/utils/friendly_error.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/fade_slide_in.dart';
import '../../core/widgets/skeleton_loader.dart';
import '../../core/widgets/state_views.dart';
import 'notifications_controller.dart';

/// Notification list with read/unread state and deep linking — tapping
/// a notification about a loan application navigates straight to that
/// application's detail screen.
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  void _handleTap(
      BuildContext context, WidgetRef ref, AppNotification notification) {
    if (!notification.isRead) {
      ref.read(notificationsActionsProvider).markAsRead(notification.id);
    }
    // The backend also creates 'document' (re-upload requested) and
    // 'customer_profile' (KYC verified/rejected) notifications, not just
    // 'loan_application' — each needs to land somewhere the customer can
    // actually act on it, not just get marked read with no navigation.
    switch (notification.relatedEntityType) {
      case 'loan_application':
        if (notification.relatedEntityId != null) {
          context.push('/loans/${notification.relatedEntityId}');
        }
      case 'document':
        context.push('/documents');
      case 'customer_profile':
        context.push('/profile');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: notificationsAsync.when(
        loading: () => ListView(
          padding: const EdgeInsets.all(16),
          children: const [
            SkeletonCard(lines: 3),
            SizedBox(height: 12),
            SkeletonCard(lines: 3),
            SizedBox(height: 12),
            SkeletonCard(lines: 3),
          ],
        ),
        error: (error, _) => ErrorView(
          message: friendlyMessage(error),
          onRetry: () => ref.invalidate(notificationsProvider),
        ),
        data: (notifications) {
          if (notifications.isEmpty) {
            return const EmptyView(
              message: 'No notifications yet.',
              icon: Icons.notifications_none,
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(notificationsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: notifications.length,
              itemBuilder: (context, index) {
                final notification = notifications[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: FadeSlideIn(
                    delay: Duration(milliseconds: 30 * index),
                    child: AppCard(
                    onTap: () => _handleTap(context, ref, notification),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          margin: const EdgeInsets.only(top: 6),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: notification.isRead
                                ? Colors.transparent
                                : Theme.of(context).colorScheme.primary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                notification.title,
                                style: Theme.of(context)
                                    .textTheme
                                    .titleSmall
                                    ?.copyWith(
                                      fontWeight: notification.isRead
                                          ? FontWeight.normal
                                          : FontWeight.bold,
                                    ),
                              ),
                              const SizedBox(height: 2),
                              Text(notification.body,
                                  style:
                                      Theme.of(context).textTheme.bodyMedium),
                              const SizedBox(height: 4),
                              Text(
                                Formatters.relativeTime(notification.createdAt),
                                style: Theme.of(context).textTheme.labelSmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
