/// Mirrors the backend's `RewardConfigResponseDto` — the "up to X%"
/// program terms, shown to every eligible customer regardless of
/// whether they've earned a reward yet.
class RewardConfig {
  const RewardConfig({
    required this.categoryId,
    required this.rewardPercent,
    required this.isActive,
    required this.customerMessage,
  });

  final String categoryId;
  final double rewardPercent;
  final bool isActive;
  final String customerMessage;

  factory RewardConfig.fromJson(Map<String, dynamic> json) {
    return RewardConfig(
      categoryId: json['categoryId'] as String,
      rewardPercent: (json['rewardPercent'] as num).toDouble(),
      isActive: json['isActive'] as bool,
      customerMessage: json['customerMessage'] as String,
    );
  }
}

/// Mirrors the backend's `RewardResponseDto` — one earned reward. Only
/// ever exists once the underlying loan has actually been disbursed;
/// see `RewardsService.generateForDisbursedLoan` on the backend.
class Reward {
  const Reward({
    required this.id,
    required this.loanId,
    required this.categoryId,
    required this.principalAmount,
    required this.rewardPercent,
    required this.rewardAmount,
    required this.status,
    required this.disbursedAt,
    required this.createdAt,
    this.paidAt,
  });

  final String id;
  final String loanId;
  final String categoryId;
  final String principalAmount;
  final double rewardPercent;
  final String rewardAmount;

  /// One of `accrued`, `paid`, `cancelled`.
  final String status;
  final DateTime disbursedAt;
  final DateTime? paidAt;
  final DateTime createdAt;

  factory Reward.fromJson(Map<String, dynamic> json) {
    return Reward(
      id: json['id'] as String,
      loanId: json['loanId'] as String,
      categoryId: json['categoryId'] as String,
      principalAmount: json['principalAmount'] as String,
      rewardPercent: (json['rewardPercent'] as num).toDouble(),
      rewardAmount: json['rewardAmount'] as String,
      status: json['status'] as String,
      disbursedAt: DateTime.parse(json['disbursedAt'] as String),
      paidAt: json['paidAt'] != null ? DateTime.parse(json['paidAt'] as String) : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
