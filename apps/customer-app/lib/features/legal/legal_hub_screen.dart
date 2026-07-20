import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/app_card.dart';

/// Legal & Policies hub — mirrors `help_center_screen.dart`'s hub
/// pattern. "Contact Us" pushes the existing `/support/contact` route
/// rather than duplicating that screen.
class LegalHubScreen extends StatelessWidget {
  const LegalHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Legal & Policies')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _LegalTile(
            icon: Icons.shield_outlined,
            title: 'Privacy Policy',
            onTap: () => context.push('/legal/privacy-policy'),
          ),
          const SizedBox(height: 12),
          _LegalTile(
            icon: Icons.description_outlined,
            title: 'Terms & Conditions',
            onTap: () => context.push('/legal/terms'),
          ),
          const SizedBox(height: 12),
          _LegalTile(
            icon: Icons.info_outline,
            title: 'Loan Facilitation Disclaimer',
            onTap: () => context.push('/legal/disclaimer'),
          ),
          const SizedBox(height: 12),
          _LegalTile(
            icon: Icons.fact_check_outlined,
            title: 'Customer Consent',
            onTap: () => context.push('/legal/consent'),
          ),
          const SizedBox(height: 12),
          _LegalTile(
            icon: Icons.delete_outline,
            title: 'Data Deletion Policy',
            onTap: () => context.push('/legal/data-deletion'),
          ),
          const SizedBox(height: 12),
          _LegalTile(
            icon: Icons.apartment_outlined,
            title: 'About Company',
            onTap: () => context.push('/legal/about'),
          ),
          const SizedBox(height: 12),
          _LegalTile(
            icon: Icons.support_agent_outlined,
            title: 'Contact Us',
            onTap: () => context.push('/support/contact'),
          ),
        ],
      ),
    );
  }
}

class _LegalTile extends StatelessWidget {
  const _LegalTile(
      {required this.icon, required this.title, required this.onTap});

  final IconData icon;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        leading: Icon(icon),
        title: Text(title),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}
