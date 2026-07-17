import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../core/auth/employee_auth_repository.dart';
import '../../core/config/env_config.dart';
import '../../core/di/injection.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/fade_slide_in.dart';
import '../../core/widgets/labeled_section.dart';

/// Staff profile — the signed-in employee's identity and sign-out
/// action. Employee accounts are pre-provisioned (see
/// `EmployeeAuthRepository`), so there's no self-service edit here,
/// only account info + session control.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;
    final user = EnvConfig.firebaseEnabled ? FirebaseAuth.instance.currentUser : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          FadeSlideIn(
            child: AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const LabeledSection(icon: Icons.badge_outlined, label: 'ACCOUNT'),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: colorScheme.primaryContainer,
                        child: Text(
                          (user?.email?.substring(0, 1) ?? '?').toUpperCase(),
                          style: textTheme.titleLarge,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user?.email ?? 'Not signed in',
                                style: textTheme.titleMedium),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: colorScheme.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                'STAFF',
                                style: textTheme.labelSmall?.copyWith(
                                  color: colorScheme.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (!EnvConfig.isProduction) ...[
            const SizedBox(height: 16),
            FadeSlideIn(
              delay: const Duration(milliseconds: 40),
              child: AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const LabeledSection(icon: Icons.dns_outlined, label: 'ENVIRONMENT'),
                    const SizedBox(height: 8),
                    Text(EnvConfig.appEnv, style: textTheme.bodyMedium),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 24),
          if (EnvConfig.firebaseEnabled)
            FadeSlideIn(
              delay: const Duration(milliseconds: 80),
              child: OutlinedButton.icon(
                onPressed: () => getIt<EmployeeAuthRepository>().signOut(),
                icon: const Icon(Icons.logout),
                label: const Text('Sign out'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
