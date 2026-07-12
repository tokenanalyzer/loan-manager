import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/formatters.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/primary_button.dart';
import 'loan_categories.dart';

/// Loan details + eligibility information for one category.
///
/// The eligibility notes are general guidance, not a personalized
/// decision — there's no backend eligibility engine to call. Framing
/// it this way (rather than faking a "You're eligible!" check) is a
/// deliberate honesty choice.
class LoanDetailsScreen extends StatelessWidget {
  const LoanDetailsScreen({required this.categoryId, super.key});

  final String categoryId;

  @override
  Widget build(BuildContext context) {
    final category = findLoanCategory(categoryId);
    final textTheme = Theme.of(context).textTheme;

    if (category == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Loan details')),
        body: const Center(child: Text('Unknown loan category.')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(category.title)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Icon(category.icon,
              size: 56, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 16),
          Text(category.title, style: textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text(category.description, style: textTheme.bodyLarge),
          const SizedBox(height: 20),
          AppCard(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Amount range', style: textTheme.labelSmall),
                      Text(
                        '${Formatters.currency(category.minAmount.toStringAsFixed(2))} – '
                        '${Formatters.currency(category.maxAmount.toStringAsFixed(2))}',
                        style: textTheme.titleMedium,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text('General eligibility guidance', style: textTheme.titleMedium),
          const SizedBox(height: 8),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final note in category.eligibilityNotes)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.check_circle_outline, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                            child: Text(note, style: textTheme.bodyMedium)),
                      ],
                    ),
                  ),
                Text(
                  'Final approval and terms are determined during application review.',
                  style: textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          PrimaryButton(
            label: 'Start application',
            onPressed: () =>
                context.push('/loans/apply?categoryId=${category.id}'),
          ),
        ],
      ),
    );
  }
}
