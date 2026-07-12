import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/primary_button.dart';

/// Shown after a successful submission. Reached via `context.go`
/// (replacing history, not pushing) so the back button can't return
/// into the now-stale wizard form.
class LoanApplicationSuccessScreen extends StatelessWidget {
  const LoanApplicationSuccessScreen({required this.applicationId, super.key});

  final String applicationId;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle,
                    color: Colors.green, size: 56),
              ),
              const SizedBox(height: 24),
              Text('Application submitted!', style: textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text(
                "We'll review your application and let you know what's next.",
                textAlign: TextAlign.center,
                style: textTheme.bodyLarge,
              ),
              const SizedBox(height: 32),
              PrimaryButton(
                label: 'View application status',
                onPressed: () => context.go('/loans/$applicationId'),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => context.go('/'),
                child: const Text('Back to home'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
