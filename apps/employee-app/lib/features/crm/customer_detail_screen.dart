import 'package:flutter/material.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/di/injection.dart';
import '../../core/models/customer_profile.dart';
import '../../core/models/customer_summary.dart';
import '../../core/network/customer_repository.dart';

/// CRM: a single customer's identity + profile, plus the KYC review
/// action (verify/reject a customer's self-attested PAN + Aadhaar
/// submission — see the backend's `CustomersService.reviewKyc`).
class CustomerDetailScreen extends StatefulWidget {
  const CustomerDetailScreen({required this.customerId, super.key});

  final String customerId;

  @override
  State<CustomerDetailScreen> createState() => _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends State<CustomerDetailScreen> {
  late Future<(CustomerSummary, CustomerProfile?)> _future;
  bool _isReviewing = false;
  String? _reviewError;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<(CustomerSummary, CustomerProfile?)> _load() async {
    final repository = getIt<CustomerRepository>();

    final summaryResult = await repository.getCustomer(widget.customerId);
    final summary = summaryResult.when(
        success: (data) => data, failure: (error) => throw error);

    final profileResult =
        await repository.getCustomerProfile(widget.customerId);
    final profile = profileResult.when(
        success: (data) => data, failure: (error) => throw error);

    return (summary, profile);
  }

  Future<void> _verify() async {
    setState(() {
      _isReviewing = true;
      _reviewError = null;
    });

    final result =
        await getIt<CustomerRepository>().verifyKyc(widget.customerId);

    if (!mounted) return;
    result.when(
      success: (_) => setState(() {
        _isReviewing = false;
        _future = _load();
      }),
      failure: (error) => setState(() {
        _isReviewing = false;
        _reviewError = error.message;
      }),
    );
  }

  Future<void> _reject() async {
    final reasonController = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject KYC'),
        content: TextField(
          controller: reasonController,
          decoration: const InputDecoration(
            labelText: 'Reason (optional)',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(reasonController.text),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
    reasonController.dispose();

    // User cancelled the dialog.
    if (reason == null) return;

    setState(() {
      _isReviewing = true;
      _reviewError = null;
    });

    final result = await getIt<CustomerRepository>()
        .rejectKyc(widget.customerId, rejectionReason: reason);

    if (!mounted) return;
    result.when(
      success: (_) => setState(() {
        _isReviewing = false;
        _future = _load();
      }),
      failure: (error) => setState(() {
        _isReviewing = false;
        _reviewError = error.message;
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Customer details')),
      body: FutureBuilder<(CustomerSummary, CustomerProfile?)>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
                child: Text('Could not load customer: ${snapshot.error}'));
          }

          final (summary, profile) = snapshot.data!;
          final isPendingReview = profile?.kycStatus == 'pending_review';

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Text(summary.fullName ?? 'Unnamed customer',
                  style: textTheme.headlineMedium),
              const SizedBox(height: 8),
              if (summary.email != null)
                Text('Email: ${summary.email}', style: textTheme.bodyMedium),
              if (summary.phone != null)
                Text('Phone: ${summary.phone}', style: textTheme.bodyMedium),
              const SizedBox(height: 16),
              if (profile == null)
                Text('No profile submitted yet.', style: textTheme.bodyMedium)
              else ...[
                Text('KYC', style: textTheme.titleMedium),
                const SizedBox(height: 8),
                StatusBadge.forKycStatus(profile.kycStatus),
                const SizedBox(height: 8),
                if (profile.panNumber != null)
                  Text('PAN: ${profile.panNumber}',
                      style: textTheme.bodyMedium),
                if (profile.aadhaarLast4 != null)
                  Text('Aadhaar: •••• •••• ${profile.aadhaarLast4}',
                      style: textTheme.bodyMedium),
                if (profile.kycStatus == 'rejected' &&
                    profile.kycRejectionReason != null)
                  Text('Rejection reason: ${profile.kycRejectionReason}',
                      style: textTheme.bodySmall),
                if (isPendingReview) ...[
                  const SizedBox(height: 12),
                  if (_reviewError != null) ...[
                    Text(_reviewError!,
                        style: TextStyle(
                            color: Theme.of(context).colorScheme.error)),
                    const SizedBox(height: 8),
                  ],
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _isReviewing ? null : _reject,
                          child: const Text('Reject'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _isReviewing ? null : _verify,
                          child: _isReviewing
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Text('Verify'),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 16),
                if (profile.addressLine1 != null)
                  Text(
                      'Address: ${profile.addressLine1}, ${profile.city ?? ''}',
                      style: textTheme.bodyMedium),
                if (profile.employmentStatus != null)
                  Text('Employment: ${profile.employmentStatus}',
                      style: textTheme.bodyMedium),
                if (profile.monthlyIncome != null)
                  Text(
                      'Monthly income: ${Formatters.currency(profile.monthlyIncome!)}',
                      style: textTheme.bodyMedium),
              ],
            ],
          );
        },
      ),
    );
  }
}
