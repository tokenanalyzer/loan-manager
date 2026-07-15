import 'package:flutter/material.dart';

/// Small icon + label used to head a group of fields inside a card
/// (KYC details, Address, Bank account, ...) — a compact, in-card
/// counterpart to [SectionHeader] (which titles a whole page section,
/// not a sub-group sitting alongside its own data inside one card).
/// Shared by the profile view and edit screens so the two don't grow
/// their own, slightly different, copies of the same label row.
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
