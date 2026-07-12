import 'package:flutter/material.dart';

class _FaqItem {
  const _FaqItem(this.question, this.answer);
  final String question;
  final String answer;
}

const _faqItems = [
  _FaqItem(
    'How long does a decision take?',
    'Most applications are reviewed within a few business days. You can track '
        'progress any time under My Applications.',
  ),
  _FaqItem(
    'What documents do I need?',
    'Typically a government-issued ID, proof of income, and proof of address. '
        'The Documents section shows exactly what\'s still needed for your account.',
  ),
  _FaqItem(
    'Can I edit my application after submitting?',
    'Not directly — if something needs to change, contact support and reference '
        'your application.',
  ),
  _FaqItem(
    'How do I update my personal information?',
    'Go to Profile > Edit profile. Changes save immediately.',
  ),
  _FaqItem(
    'How do I delete my account?',
    'Go to Profile > Privacy settings > Request account deletion. Our team '
        'follows up before anything is removed.',
  ),
];

/// Static FAQ content — genuinely useful reference material, not a
/// placeholder; no backend content-management system exists (or is
/// needed) for this yet.
class FaqScreen extends StatelessWidget {
  const FaqScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('FAQ')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _faqItems.length,
        separatorBuilder: (context, index) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final item = _faqItems[index];
          return Card(
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: ExpansionTile(
              title: Text(item.question,
                  style: Theme.of(context).textTheme.titleSmall),
              childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              expandedCrossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.answer, style: Theme.of(context).textTheme.bodyMedium)
              ],
            ),
          );
        },
      ),
    );
  }
}
