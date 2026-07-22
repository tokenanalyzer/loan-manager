import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/reward.dart';
import '../../core/riverpod/providers.dart';

/// The Personal Loan reward program's terms — "up to X%" — shown to
/// every eligible customer regardless of whether they've earned one
/// yet. A 404 here means no reward program exists for this category
/// (not an error state the customer should see); callers treat a null
/// value as "don't show the rewards section" rather than an error.
final rewardConfigProvider = FutureProvider.autoDispose<RewardConfig?>((ref) async {
  final repository = ref.read(rewardRepositoryProvider);
  final result = await repository.getConfig();
  return result.when(
    success: (data) => data,
    failure: (error) => error.statusCode == 404 ? null : throw error,
  );
});

/// The customer's own reward history. Empty for every customer today —
/// see `RewardsService.generateForDisbursedLoan` on the backend for
/// why: nothing has been disbursed yet anywhere in the system. Not a
/// bug; the UI's empty state explains this rather than looking broken.
final myRewardsProvider = FutureProvider.autoDispose<List<Reward>>((ref) async {
  final repository = ref.read(rewardRepositoryProvider);
  final result = await repository.getMyRewards();
  return result.when(success: (data) => data, failure: (error) => throw error);
});
