import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/app_card.dart';

/// Help Center hub — links to FAQ and Contact Support. Content here
/// is static, in-app reference material (no backend needed for this
/// kind of content, same as any app's help pages).
class HelpCenterScreen extends StatelessWidget {
  const HelpCenterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Help Center')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          AppCard(
            onTap: () => context.push('/support/faq'),
            child: const ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.quiz_outlined),
              title: Text('Frequently asked questions'),
              trailing: Icon(Icons.chevron_right),
            ),
          ),
          const SizedBox(height: 12),
          AppCard(
            onTap: () => context.push('/support/contact'),
            child: const ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.support_agent_outlined),
              title: Text('Contact support'),
              trailing: Icon(Icons.chevron_right),
            ),
          ),
        ],
      ),
    );
  }
}
