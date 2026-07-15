import 'package:flutter/material.dart';
import 'package:shared_flutter/shared_flutter.dart';

import 'app_card.dart';

/// The Key-Fact-Statement-style cost card used everywhere a loan's
/// numbers are shown — the indicative pre-approval estimate (category
/// details, the application wizard) and the confirmed, approved loan
/// (Application Detail). Never just a bare EMI number: EMI, interest,
/// one-time processing fee + GST, net disbursed, and total payable are
/// always shown together, so the customer sees the real cost of
/// borrowing before or right after they commit to it.
class LoanCostBreakdownCard extends StatelessWidget {
  const LoanCostBreakdownCard({
    required this.title,
    required this.breakdown,
    required this.tenureMonths,
    required this.rateLabel,
    this.isIndicative = true,
    this.footnote,
    super.key,
  });

  final String title;
  final LoanCostBreakdown breakdown;
  final int tenureMonths;
  final String rateLabel;
  final bool isIndicative;
  final String? footnote;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: textTheme.labelMedium),
          const SizedBox(height: 6),
          Text(
            '${Formatters.currency(breakdown.monthlyInstallment.toStringAsFixed(2))} / month',
            style: textTheme.headlineMedium?.copyWith(color: colorScheme.primary),
          ),
          Text('$rateLabel · $tenureMonths months', style: textTheme.bodySmall),
          const Divider(height: 28),
          _Row(label: 'Loan amount', value: Formatters.currency(breakdown.principal.toStringAsFixed(2))),
          _Row(label: 'Total interest', value: Formatters.currency(breakdown.totalInterest.toStringAsFixed(2))),
          _Row(label: 'Processing fee', value: Formatters.currency(breakdown.processingFee.toStringAsFixed(2))),
          _Row(label: 'GST on fee (18%)', value: Formatters.currency(breakdown.gstOnFee.toStringAsFixed(2))),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: colorScheme.primary.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                _Row(
                  label: 'Net amount disbursed',
                  value: Formatters.currency(breakdown.netDisbursed.toStringAsFixed(2)),
                  emphasize: true,
                ),
                _Row(
                  label: 'Total payable (over $tenureMonths months)',
                  value: Formatters.currency(breakdown.totalPayable.toStringAsFixed(2)),
                  emphasize: true,
                  isLast: true,
                ),
              ],
            ),
          ),
          if (footnote != null) ...[
            const SizedBox(height: 12),
            Text(footnote!, style: textTheme.bodySmall),
          ] else if (isIndicative) ...[
            const SizedBox(height: 12),
            Text(
              'Indicative estimate — your actual rate, fee, and eligibility are confirmed during application review.',
              style:
                  textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.label,
    required this.value,
    this.emphasize = false,
    this.isLast = false,
  });

  final String label;
  final String value;
  final bool emphasize;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(label,
                style: emphasize ? textTheme.titleSmall : textTheme.bodyMedium),
          ),
          Text(
            value,
            style: (emphasize ? textTheme.titleSmall : textTheme.bodyMedium)
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}
