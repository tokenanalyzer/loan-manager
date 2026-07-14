import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/employee_auth_repository.dart';
import '../../core/config/env_config.dart';
import '../../core/di/injection.dart';

/// The authenticated landing page — a navigation hub for staff
/// features (CRM, loan application review).
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Loan Manager — Staff'),
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
          Text('Staff dashboard', style: textTheme.headlineMedium),
          if (!EnvConfig.isProduction) ...[
            const SizedBox(height: 8),
            Text('Environment: ${EnvConfig.appEnv}',
                style: textTheme.bodySmall),
          ],
          const SizedBox(height: 24),
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
