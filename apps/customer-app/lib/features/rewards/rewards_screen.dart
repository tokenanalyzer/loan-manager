import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/models/reward.dart';
import '../../core/utils/friendly_error.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/fade_slide_in.dart';
import '../../core/widgets/skeleton_loader.dart';
import '../../core/widgets/state_views.dart';
import 'rewards_controller.dart';

/// Personal Loan rewards — program terms (always shown, once a config
/// exists) plus the customer's own reward history (empty for everyone
/// today, since nothing has been disbursed anywhere in the system yet
/// — see `RewardsService.generateForDisbursedLoan` on the backend).
/// The empty state says so explicitly rather than looking broken.
class RewardsScreen extends ConsumerWidget {
  const RewardsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final configAsync = ref.watch(rewardConfigProvider);
    final rewardsAsync = ref.watch(myRewardsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Rewards')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(rewardConfigProvider);
          ref.invalidate(myRewardsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            configAsync.when(
              loading: () => const SkeletonCard(lines: 2),
              error: (error, _) => ErrorView(message: friendlyMessage(error)),
              data: (config) {
                if (config == null || !config.isActive) {
                  return const SizedBox.shrink();
                }
                return FadeSlideIn(child: _RewardBanner(config: config));
              },
            ),
            const SizedBox(height: 20),
            Text('Reward history', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            rewardsAsync.when(
              loading: () => const SkeletonCard(lines: 3),
              error: (error, _) => ErrorView(
                message: friendlyMessage(error),
                onRetry: () => ref.invalidate(myRewardsProvider),
              ),
              data: (rewards) => rewards.isEmpty
                  ? const EmptyView(
                      icon: Icons.emoji_events_outlined,
                      message:
                          "No rewards yet — they're credited automatically once an "
                          'eligible Personal Loan is disbursed.',
                    )
                  : Column(
                      children: [
                        for (var i = 0; i < rewards.length; i++)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: FadeSlideIn(
                              delay: Duration(milliseconds: 30 * i),
                              child: _RewardTile(reward: rewards[i]),
                            ),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RewardBanner extends StatelessWidget {
  const _RewardBanner({required this.config});

  final RewardConfig config;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.accentGold, Color(0xFFB8860B)],
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.emoji_events_rounded, color: Colors.white, size: 36),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              config.customerMessage,
              style: textTheme.titleSmall?.copyWith(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

class _RewardTile extends StatelessWidget {
  const _RewardTile({required this.reward});

  final Reward reward;

  (String, Color) get _statusStyle => switch (reward.status) {
        'accrued' => ('Accrued', AppColors.success),
        'paid' => ('Paid', AppColors.success),
        'cancelled' => ('Cancelled', AppColors.error),
        _ => (reward.status, AppColors.textTertiary),
      };

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final (label, color) = _statusStyle;

    return AppCard(
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  Formatters.currency(reward.rewardAmount),
                  style: textTheme.titleMedium,
                ),
                const SizedBox(height: 2),
                Text(
                  '${reward.rewardPercent}% of ${Formatters.currency(reward.principalAmount)} · '
                  '${Formatters.date(reward.disbursedAt)}',
                  style: textTheme.bodySmall,
                ),
              ],
            ),
          ),
          StatusBadge(label: label, color: color),
        ],
      ),
    );
  }
}
