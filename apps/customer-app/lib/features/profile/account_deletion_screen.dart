import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/riverpod/providers.dart';
import '../../core/widgets/primary_button.dart';

/// Confirmation screen for requesting account deletion.
///
/// This *records a request* (audit-logged on the backend) — it does
/// not delete anything immediately. See the backend's
/// CustomersService.requestAccountDeletion for why an immediate hard
/// delete of a financial/loan customer record isn't implemented.
class AccountDeletionScreen extends ConsumerStatefulWidget {
  const AccountDeletionScreen({super.key});

  @override
  ConsumerState<AccountDeletionScreen> createState() => _AccountDeletionScreenState();
}

class _AccountDeletionScreenState extends ConsumerState<AccountDeletionScreen> {
  bool _isSubmitting = false;
  bool _requested = false;
  String? _errorMessage;

  Future<void> _confirm() async {
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final result = await ref.read(customerProfileRepositoryProvider).requestAccountDeletion();

    if (!mounted) return;

    result.when(
      success: (_) => setState(() {
        _isSubmitting = false;
        _requested = true;
      }),
      failure: (error) => setState(() {
        _isSubmitting = false;
        _errorMessage = error.message;
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    if (_requested) {
      return Scaffold(
        appBar: AppBar(title: const Text('Account deletion')),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle_outline, size: 56, color: Colors.green),
              const SizedBox(height: 16),
              Text('Request received', style: textTheme.headlineSmall, textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                "We've recorded your account-deletion request. Our team will follow up before "
                "anything is removed, since active loans and records may need to be resolved first.",
                textAlign: TextAlign.center,
                style: textTheme.bodyMedium,
              ),
              const SizedBox(height: 24),
              TextButton(onPressed: () => context.go('/'), child: const Text('Back to home')),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Delete account')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Are you sure?', style: textTheme.headlineSmall),
            const SizedBox(height: 12),
            Text(
              'Requesting account deletion will notify our team to review and process your '
              "request. This can't be undone once completed, and any active loan applications "
              'or loans may need to be resolved first.',
              style: textTheme.bodyMedium,
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Text(_errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const Spacer(),
            PrimaryButton(
              label: 'Request account deletion',
              isLoading: _isSubmitting,
              onPressed: _confirm,
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
          ],
        ),
      ),
    );
  }
}
