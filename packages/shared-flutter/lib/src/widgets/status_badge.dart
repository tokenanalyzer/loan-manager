import 'package:flutter/material.dart';

/// Reusable status pill — used for loan application status, KYC
/// status, document status, and notification read/unread state, so
/// color-coding stays consistent across both Flutter apps instead of
/// each screen (or each app) inventing its own.
class StatusBadge extends StatelessWidget {
  const StatusBadge({required this.label, required this.color, super.key});

  final String label;
  final Color color;

  factory StatusBadge.forApplicationStatus(String status) {
    final (label, color) = switch (status) {
      'submitted' => ('Submitted', Colors.blueGrey),
      'under_review' => ('Under review', Colors.orange),
      'approved' => ('Approved', Colors.green),
      'rejected' => ('Not approved', Colors.red),
      'withdrawn' => ('Withdrawn', Colors.grey),
      _ => (status, Colors.blueGrey),
    };
    return StatusBadge(label: label, color: color);
  }

  factory StatusBadge.forKycStatus(String status) {
    final (label, color) = switch (status) {
      'not_submitted' => ('KYC not submitted', Colors.blueGrey),
      'pending_review' => ('KYC pending review', Colors.orange),
      'verified' => ('KYC verified', Colors.green),
      'rejected' => ('KYC rejected', Colors.red),
      _ => (status, Colors.blueGrey),
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
