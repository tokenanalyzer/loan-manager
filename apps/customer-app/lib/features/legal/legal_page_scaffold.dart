import 'package:flutter/material.dart';
import 'package:shared_flutter/shared_flutter.dart';

/// Shared shell for every static Legal page — an app bar, an
/// "Effective <date>" byline, and a scrollable list of [LegalSection]s.
/// Keeps the six policy screens visually consistent without repeating
/// this layout in each one.
class LegalPageScaffold extends StatelessWidget {
  const LegalPageScaffold({
    required this.title,
    required this.effectiveDate,
    required this.sections,
    super.key,
  });

  final String title;
  final String effectiveDate;
  final List<Widget> sections;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Effective $effectiveDate',
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          ...sections,
        ],
      ),
    );
  }
}

/// One headed paragraph within a Legal page.
class LegalSection extends StatelessWidget {
  const LegalSection({required this.heading, required this.body, super.key});

  final String heading;
  final String body;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            heading,
            style: textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Text(body, style: textTheme.bodyMedium),
        ],
      ),
    );
  }
}
