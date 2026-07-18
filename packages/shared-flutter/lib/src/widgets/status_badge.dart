import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Reusable status pill — used for loan application status, KYC
/// status, document status, and notification read/unread state, so
/// color-coding stays consistent across both Flutter apps instead of
/// each screen (or each app) inventing its own.
///
/// Colors are always drawn from [AppColors] (never raw `Colors.*`) so
/// the badge stays on-brand and legible in both light and dark theme.
class StatusBadge extends StatelessWidget {
  const StatusBadge({required this.label, required this.color, super.key});

  final String label;
  final Color color;

  factory StatusBadge.forApplicationStatus(String status) {
    final (label, color) = switch (status) {
      'submitted' => ('Submitted', AppColors.textTertiary),
      'under_review' => ('Under review', AppColors.warning),
      'query_raised' => ('Action needed', AppColors.accentGold),
      'approved' => ('Approved', AppColors.success),
      'rejected' => ('Not approved', AppColors.error),
      'withdrawn' => ('Withdrawn', AppColors.textTertiary),
      _ => (status, AppColors.textTertiary),
    };
    return StatusBadge(label: label, color: color);
  }

  factory StatusBadge.forKycStatus(String status) {
    final (label, color) = switch (status) {
      'not_submitted' => ('KYC not submitted', AppColors.textTertiary),
      'pending_review' => ('KYC pending review', AppColors.warning),
      'verified' => ('KYC verified', AppColors.success),
      'rejected' => ('KYC rejected', AppColors.error),
      _ => (status, AppColors.textTertiary),
    };
    return StatusBadge(label: label, color: color);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style:
            TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12),
      ),
    );
  }
}
