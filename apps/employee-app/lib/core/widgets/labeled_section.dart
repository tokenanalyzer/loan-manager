import 'package:flutter/material.dart';

/// Small icon + label used to head a group of fields inside a card
/// (Account, Session, ...) — a compact, in-card section label.
class LabeledSection extends StatelessWidget {
  const LabeledSection({required this.icon, required this.label, super.key});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        Icon(icon, size: 16, color: colorScheme.primary),
        const SizedBox(width: 6),
        Text(label, style: Theme.of(context).textTheme.labelSmall),
      ],
    );
  }
}
