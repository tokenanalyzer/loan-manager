import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/employee_auth_repository.dart';
import '../../core/config/env_config.dart';
import '../../core/di/injection.dart';

/// The authenticated landing page — now a navigation hub for the
/// Phase 5 features (CRM, application review).
///
/// Phase 2 scope: exists only to verify the app compiles, boots, and
/// wires up theming/routing/environment config correctly end-to-end.
/// No CRM/loan business logic lives here — only navigation to the
/// screens that do.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Loan Manager — Employee App'),
        actions: [
          if (EnvConfig.firebaseEnabled)
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Sign out',
              onPressed: () => getIt<EmployeeAuthRepository>().signOut(),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'Phase 2 development environment is running.',
            style: textTheme.headlineMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text('Environment: ${EnvConfig.appEnv}', style: textTheme.bodyMedium),
          Text('API base URL: ${EnvConfig.apiBaseUrl}',
              style: textTheme.bodyMedium),
          const SizedBox(height: 32),
          Card(
            child: ListTile(
              leading: const Icon(Icons.people),
              title: const Text('Customers'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/customers'),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.request_page),
              title: const Text('Loan applications'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/applications'),
            ),
          ),
        ],
      ),
    );
  }
}
