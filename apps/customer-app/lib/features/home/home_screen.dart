import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/customer_auth_repository.dart';
import '../../core/config/env_config.dart';
import '../../core/di/injection.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/status_badge.dart';
import '../loans/loan_categories.dart';
import 'home_controller.dart';

/// The Home dashboard — user greeting, active applications, loan
/// category quick-links, quick actions, and a notifications summary.
///
/// Phase 2 scope note (kept for history): this screen originally
/// existed only to verify the app compiled and booted. Phase 6
/// replaces that placeholder with the real dashboard described above.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(homeControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Loan Manager'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            tooltip: 'Notifications',
            onPressed: () => context.push('/notifications'),
          ),
          if (EnvConfig.firebaseEnabled)
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Sign out',
              onPressed: () => getIt<CustomerAuthRepository>().signOut(),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(homeControllerProvider.notifier).refresh(),
        child: dashboardAsync.when(
          loading: () => const LoadingView(),
          error: (error, _) => ErrorView(
            message: 'Could not load your dashboard: $error',
            onRetry: () => ref.invalidate(homeControllerProvider),
          ),
          data: (data) => _DashboardContent(data: data),
        ),
      ),
    );
  }
}

class _DashboardContent extends StatelessWidget {
  const _DashboardContent({required this.data});

  final HomeDashboardData data;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final name = data.userProfile?.fullName;
    final greeting = (name != null && name.isNotEmpty)
        ? 'Hello, ${name.split(' ').first}!'
        : 'Hello!';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(greeting, style: textTheme.headlineMedium),
        const SizedBox(height: 4),
        Text(
          'Phase 2 development environment is running.',
          style: textTheme.bodySmall,
        ),
        Text('Environment: ${EnvConfig.appEnv}', style: textTheme.bodySmall),
        const SizedBox(height: 20),

        // Notifications summary.
        AppCard(
          onTap: () => context.push('/notifications'),
          child: Row(
            children: [
              Icon(Icons.notifications_outlined,
                  color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  data.unreadNotificationCount > 0
                      ? '${data.unreadNotificationCount} unread notification${data.unreadNotificationCount == 1 ? '' : 's'}'
                      : "You're all caught up",
                  style: textTheme.bodyLarge,
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Active applications.
        Text('Active applications', style: textTheme.titleMedium),
        const SizedBox(height: 8),
        if (data.activeApplications.isEmpty)
          AppCard(
            child: Row(
              children: [
                const Expanded(
                    child: Text('No active applications right now.')),
                TextButton(
                  onPressed: () => context.push('/loans/categories'),
                  child: const Text('Apply now'),
                ),
              ],
            ),
          )
        else
          ...data.activeApplications.map(
            (application) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: AppCard(
                onTap: () => context.push('/loans/${application.id}'),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            Formatters.currency(application.requestedAmount),
                            style: textTheme.titleMedium,
                          ),
                          Text(
                            '${application.requestedTermMonths} months',
                            style: textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    StatusBadge.forApplicationStatus(application.status),
                  ],
                ),
              ),
            ),
          ),
        const SizedBox(height: 20),

        // Loan categories.
        Text('Apply for a loan', style: textTheme.titleMedium),
        const SizedBox(height: 8),
        SizedBox(
          height: 108,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: kLoanCategories.length,
            separatorBuilder: (context, index) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final category = kLoanCategories[index];
              return SizedBox(
                width: 108,
                child: AppCard(
                  padding: const EdgeInsets.all(12),
                  onTap: () => context.push('/loans/categories/${category.id}'),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(category.icon,
                          color: Theme.of(context).colorScheme.primary,
                          size: 28),
                      const SizedBox(height: 8),
                      Text(
                        category.title,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.labelSmall,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 20),

        // Quick actions.
        Text('Quick actions', style: textTheme.titleMedium),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _QuickAction(
                icon: Icons.description_outlined,
                label: 'My applications',
                onTap: () => context.push('/loans'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _QuickAction(
                icon: Icons.upload_file_outlined,
                label: 'Documents',
                onTap: () => context.push('/documents'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _QuickAction(
                icon: Icons.person_outline,
                label: 'Profile',
                onTap: () => context.push('/profile'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _QuickAction(
                icon: Icons.help_outline,
                label: 'Support',
                onTap: () => context.push('/support'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction(
      {required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      child: Column(
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 8),
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}
