import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:shared_flutter/shared_flutter.dart';

import '../../core/config/env_config.dart';
import '../../core/utils/friendly_error.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/skeleton_loader.dart';
import '../../core/widgets/state_views.dart';
import '../loans/status_timeline.dart';
import 'home_controller.dart';

/// The Home dashboard — the app's first impression. Every section
/// below is built from real data (or simply not rendered if that data
/// doesn't exist yet) — no placeholder numbers, no "Environment:
/// development" text, no repeated content across sections.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(homeControllerProvider);

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.read(homeControllerProvider.notifier).refresh(),
          child: dashboardAsync.when(
            loading: () => ListView(
              padding: const EdgeInsets.all(16),
              children: const [
                SkeletonCard(lines: 2),
                SizedBox(height: 16),
                SkeletonCard(),
                SizedBox(height: 16),
                SkeletonCard(),
              ],
            ),
            error: (error, _) => ErrorView(
              message: friendlyMessage(error),
              onRetry: () => ref.invalidate(homeControllerProvider),
            ),
            data: (data) => _DashboardContent(data: data),
          ),
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
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        _Header(data: data),
        const SizedBox(height: 20),
        _CreditProfileCard(data: data),
        const SizedBox(height: 20),
        _LoansForYouSection(data: data),
        const SizedBox(height: 20),
        _ActiveApplicationsSection(data: data),
        if (data.approvedLoans.isNotEmpty) ...[
          const SizedBox(height: 20),
          _EmiSummaryCard(data: data),
        ],
        const SizedBox(height: 20),
        _LendingPartnersSection(),
        const SizedBox(height: 20),
        _QuickActionsSection(),
        if (data.recentActivity.isNotEmpty) ...[
          const SizedBox(height: 20),
          _RecentActivitySection(data: data),
        ],
      ],
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.data});

  final HomeDashboardData data;

  String get _greeting {
    final hour = DateTime.now().hour;
    final period = hour < 12
        ? 'morning'
        : hour < 17
            ? 'afternoon'
            : 'evening';
    final name = data.userProfile?.fullName;
    final firstName = (name != null && name.isNotEmpty) ? name.split(' ').first : null;
    return firstName != null
        ? 'Good $period, $firstName'
        : 'Good $period';
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;
    final initials = _initialsFor(data.userProfile?.fullName);

    return Row(
      children: [
        GestureDetector(
          onTap: () => context.push('/profile'),
          child: CircleAvatar(
            radius: 24,
            backgroundColor: colorScheme.primary.withValues(alpha: 0.12),
            child: Text(
              initials,
              style: textTheme.titleMedium?.copyWith(color: colorScheme.primary),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_greeting, style: textTheme.headlineMedium),
              if (!EnvConfig.isProduction)
                Text('Environment: ${EnvConfig.appEnv}',
                    style: textTheme.bodySmall),
            ],
          ),
        ),
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_outlined),
              tooltip: 'Notifications',
              onPressed: () => context.push('/notifications'),
            ),
            if (data.unreadNotificationCount > 0)
              Positioned(
                right: 6,
                top: 6,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: colorScheme.error,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }

  static String _initialsFor(String? fullName) {
    if (fullName == null || fullName.trim().isEmpty) return '?';
    final parts = fullName.trim().split(RegExp(r'\s+'));
    final first = parts.first.isNotEmpty ? parts.first[0] : '';
    final last = parts.length > 1 && parts.last.isNotEmpty ? parts.last[0] : '';
    return (first + last).toUpperCase();
  }
}

class _CreditProfileCard extends StatelessWidget {
  const _CreditProfileCard({required this.data});

  final HomeDashboardData data;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;
    final strength = data.profileStrength;
    final nudge = data.profileStrengthNudge;

    return AppCard(
      onTap: () => context.push('/profile'),
      child: Row(
        children: [
          SizedBox(
            width: 56,
            height: 56,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: strength,
                  strokeWidth: 5,
                  backgroundColor: colorScheme.surfaceContainerHighest,
                  valueColor: AlwaysStoppedAnimation(
                    strength >= 1 ? AppColors.success : AppColors.accentGold,
                  ),
                ),
                Text('${(strength * 100).round()}%',
                    style: textTheme.labelSmall),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Credit profile', style: textTheme.titleSmall),
                const SizedBox(height: 4),
                Text(
                  nudge ?? 'Your profile is complete. You may see better offers.',
                  style: textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}

class _LoansForYouSection extends StatelessWidget {
  const _LoansForYouSection({required this.data});

  final HomeDashboardData data;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final offers = data.eligibilityOffers;

    if (offers.isEmpty) {
      return AppCard(
        onTap: () => context.push('/profile/edit'),
        child: Row(
          children: [
            Icon(Icons.trending_up, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            const Expanded(
              child: Text('Add your income to see loans you may be eligible for.'),
            ),
            const Icon(Icons.chevron_right),
          ],
        ),
      );
    }

    final topAmount = offers.first.eligibleAmount;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Loans for you', style: textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(
          'You could be eligible for up to ${Formatters.currency(topAmount.toStringAsFixed(0))}.',
          style: textTheme.bodyMedium,
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 148,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: offers.length,
            separatorBuilder: (context, index) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final offer = offers[index];
              return SizedBox(
                width: 190,
                child: AppCard(
                  onTap: () => context.push(
                    '/loans/apply?categoryId=${offer.category.id}',
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(offer.category.icon,
                              size: 20, color: AppColors.accentGold),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Pre-approved',
                              style: textTheme.labelSmall
                                  ?.copyWith(color: AppColors.accentGold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(offer.category.title, style: textTheme.titleSmall),
                      const SizedBox(height: 4),
                      Text(
                        'Up to ${Formatters.currency(offer.eligibleAmount.toStringAsFixed(0))}',
                        style: textTheme.titleMedium,
                      ),
                      Text(
                        '${offer.category.indicativeRateMin}–${offer.category.indicativeRateMax}% p.a.',
                        style: textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Indicative estimate — subject to verification. Not a guaranteed offer.',
          style: textTheme.bodySmall,
        ),
      ],
    );
  }
}

class _ActiveApplicationsSection extends StatelessWidget {
  const _ActiveApplicationsSection({required this.data});

  final HomeDashboardData data;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final active = data.activeApplications;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Active applications', style: textTheme.titleMedium),
        const SizedBox(height: 8),
        if (active.isEmpty)
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
          ...active.map((application) {
            final steps = buildApplicationTimeline(
              status: application.status,
              submittedAt: application.submittedAt,
              reviewedAt: application.reviewedAt,
            );
            final progress =
                steps.where((s) => s.isComplete).length / steps.length;
            final category = application.categoryId != null
                ? findLoanCategory(application.categoryId!)
                : null;

            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: AppCard(
                onTap: () => context.push('/loans/${application.id}'),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (category != null)
                                Text(category.title, style: textTheme.labelSmall),
                              Text(
                                Formatters.currency(application.requestedAmount),
                                style: textTheme.titleMedium,
                              ),
                            ],
                          ),
                        ),
                        StatusBadge.forApplicationStatus(application.status),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(value: progress, minHeight: 6),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}

class _EmiSummaryCard extends StatelessWidget {
  const _EmiSummaryCard({required this.data});

  final HomeDashboardData data;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final nextMaturity = data.nextMaturityDate;

    return AppCard(
      onTap: () => context.push('/loans'),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Monthly EMI outstanding', style: textTheme.labelMedium),
                const SizedBox(height: 4),
                Text(
                  Formatters.currency(data.totalMonthlyEmi.toStringAsFixed(2)),
                  style: textTheme.headlineMedium,
                ),
                if (nextMaturity != null)
                  Text('Next maturity: ${Formatters.date(nextMaturity)}',
                      style: textTheme.bodySmall),
              ],
            ),
          ),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}

class _LendingPartnersSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Lending partners', style: textTheme.titleMedium),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: AppCard(
                child: Column(
                  children: [
                    Icon(Icons.account_balance_outlined, color: colorScheme.primary),
                    const SizedBox(height: 6),
                    Text('Loan Manager', style: textTheme.labelMedium, textAlign: TextAlign.center),
                    const SizedBox(height: 2),
                    Text('Active', style: textTheme.bodySmall?.copyWith(color: AppColors.success)),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Opacity(
                opacity: 0.5,
                child: AppCard(
                  child: Column(
                    children: [
                      Icon(Icons.account_balance_outlined, color: colorScheme.onSurfaceVariant),
                      const SizedBox(height: 6),
                      Text('New partner', style: textTheme.labelMedium, textAlign: TextAlign.center),
                      const SizedBox(height: 2),
                      Text('Coming soon', style: textTheme.bodySmall),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Opacity(
                opacity: 0.5,
                child: AppCard(
                  child: Column(
                    children: [
                      Icon(Icons.account_balance_outlined, color: colorScheme.onSurfaceVariant),
                      const SizedBox(height: 6),
                      Text('New partner', style: textTheme.labelMedium, textAlign: TextAlign.center),
                      const SizedBox(height: 2),
                      Text('Coming soon', style: textTheme.bodySmall),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _QuickActionsSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
            const SizedBox(width: 12),
            Expanded(
              child: _QuickAction(
                icon: Icons.calculate_outlined,
                label: 'EMI Calculator',
                onTap: () => context.push('/tools/emi-calculator'),
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
            const SizedBox(width: 12),
            const Expanded(child: SizedBox()),
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
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      child: Column(
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _RecentActivitySection extends StatelessWidget {
  const _RecentActivitySection({required this.data});

  final HomeDashboardData data;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Recent activity', style: textTheme.titleMedium),
        const SizedBox(height: 8),
        AppCard(
          child: Column(
            children: [
              for (var i = 0; i < data.recentActivity.length; i++) ...[
                if (i > 0) const Divider(height: 20),
                _ActivityRow(item: data.recentActivity[i]),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _ActivityRow extends StatelessWidget {
  const _ActivityRow({required this.item});

  final RecentActivityItem item;

  IconData get _icon => switch (item.kind) {
        ActivityKind.approved => Icons.check_circle_outline,
        ActivityKind.rejected => Icons.info_outline,
        ActivityKind.submitted => Icons.send_outlined,
        ActivityKind.notification => Icons.notifications_outlined,
      };

  Color _color(BuildContext context) => switch (item.kind) {
        ActivityKind.approved => AppColors.success,
        ActivityKind.rejected => Theme.of(context).colorScheme.error,
        _ => Theme.of(context).colorScheme.primary,
      };

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(_icon, size: 20, color: _color(context)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item.title, style: textTheme.bodyLarge),
              Text(item.subtitle,
                  style: textTheme.bodySmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
        Text(Formatters.relativeTime(item.timestamp), style: textTheme.labelSmall),
      ],
    );
  }
}
