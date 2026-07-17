import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/di/injection.dart';
import '../../core/models/customer_profile.dart';
import '../../core/models/customer_summary.dart';
import '../../core/models/document.dart';
import '../../core/network/customer_repository.dart';
import '../../core/riverpod/providers.dart';
import '../../core/widgets/state_views.dart';
import '../documents/document_preview_screen.dart';
import 'customers_controller.dart';

/// CRM: a single customer's identity + profile, plus the KYC review
/// action (verify/reject a customer's self-attested PAN + Aadhaar
/// submission — see the backend's `CustomersService.reviewKyc`).
class CustomerDetailScreen extends ConsumerStatefulWidget {
  const CustomerDetailScreen({required this.customerId, super.key});

  final String customerId;

  @override
  ConsumerState<CustomerDetailScreen> createState() =>
      _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends ConsumerState<CustomerDetailScreen> {
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
      success: (_) {
        setState(() {
          _isReviewing = false;
          _future = _load();
        });
        ref.read(customersControllerProvider.notifier).refresh();
      },
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
      success: (_) {
        setState(() {
          _isReviewing = false;
          _future = _load();
        });
        ref.read(customersControllerProvider.notifier).refresh();
      },
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
              const SizedBox(height: 24),
              Text('Documents', style: textTheme.titleMedium),
              const SizedBox(height: 8),
              _DocumentsSection(customerId: widget.customerId),
            ],
          );
        },
      ),
    );
  }
}

/// Uploaded-documents list for a single customer — read-only, staff
/// review context. Fetched independently from the profile/KYC
/// `_future` above so a document-preview round trip doesn't force a
/// reload of the whole screen.
class _DocumentsSection extends ConsumerStatefulWidget {
  const _DocumentsSection({required this.customerId});

  final String customerId;

  @override
  ConsumerState<_DocumentsSection> createState() => _DocumentsSectionState();
}

class _DocumentsSectionState extends ConsumerState<_DocumentsSection> {
  late Future<DocumentsOverview> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<DocumentsOverview> _load() async {
    final result = await ref
        .read(documentRepositoryProvider)
        .getOverviewForCustomer(widget.customerId);
    return result.when(success: (data) => data, failure: (error) => throw error);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<DocumentsOverview>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: LoadingView(),
          );
        }
        if (snapshot.hasError) {
          return ErrorView(
            message: 'Could not load documents: ${snapshot.error}',
            onRetry: () => setState(() => _future = _load()),
          );
        }

        final uploaded = snapshot.data!.uploadedDocuments;
        if (uploaded.isEmpty) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Text('No documents uploaded yet.'),
          );
        }

        return Column(
          children: [
            for (final (typeLabel, document) in uploaded)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Icon(document.mimeType == 'application/pdf'
                      ? Icons.picture_as_pdf_outlined
                      : Icons.image_outlined),
                  title: Text(typeLabel),
                  subtitle: Text(document.originalFileName),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(
                    builder: (context) =>
                        DocumentPreviewScreen(document: document),
                  )),
                ),
              ),
          ],
        );
      },
    );
  }
}
