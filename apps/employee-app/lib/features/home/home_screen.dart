import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/app_card.dart';
import '../../core/widgets/skeleton_loader.dart';
import '../../core/widgets/state_views.dart';
import '../loans/applications_controller.dart';
import '../notifications/notifications_controller.dart';

const _pendingStatuses = {'submitted', 'under_review'};

/// Staff dashboard — a pending-review count plus shortcuts into the
/// Customers/Applications tabs. The real list/detail work happens in
/// those tabs; this screen is an at-a-glance summary.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = Theme.of(context).textTheme;
    final applicationsAsync = ref.watch(applicationsControllerProvider);
    final notificationsAsync = ref.watch(notificationsProvider);
    final unreadCount = notificationsAsync.maybeWhen(
      data: (notifications) => notifications.where((n) => !n.isRead).length,
      orElse: () => 0,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Staff dashboard'),
        actions: [
          IconButton(
            tooltip: 'Notifications',
            onPressed: () => context.push('/notifications'),
            icon: Badge(
              label: Text('$unreadCount'),
              isLabelVisible: unreadCount > 0,
              child: const Icon(Icons.notifications_outlined),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(applicationsControllerProvider.notifier).refresh(),
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            applicationsAsync.when(
              loading: () => const SkeletonCard(lines: 2),
              error: (error, _) => ErrorView(
                message: 'Could not load applications: $error',
                onRetry: () =>
                    ref.read(applicationsControllerProvider.notifier).refresh(),
              ),
              data: (applications) {
                final pendingCount = applications
                    .where((app) => _pendingStatuses.contains(app.status))
                    .length;

                return AppCard(
                  onTap: () => context.go('/applications'),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Pending review', style: textTheme.bodySmall),
                            const SizedBox(height: 4),
                            Text('$pendingCount applications',
                                style: textTheme.headlineSmall),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            AppCard(
              onTap: () => context.go('/customers'),
              child: Row(
                children: [
                  const Icon(Icons.people_outline),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text('Browse customers', style: textTheme.titleMedium),
                  ),
                  const Icon(Icons.chevron_right),
                ],
              ),
            ),
            const SizedBox(height: 12),
            AppCard(
              onTap: () => context.go('/applications'),
              child: Row(
                children: [
                  const Icon(Icons.request_page_outlined),
                  const SizedBox(width: 16),
                  Expanded(
                    child:
                        Text('Review applications', style: textTheme.titleMedium),
                  ),
                  const Icon(Icons.chevron_right),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
