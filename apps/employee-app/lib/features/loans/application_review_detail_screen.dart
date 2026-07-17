import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/di/injection.dart';
import '../../core/models/loan_application.dart';
import '../../core/network/loan_application_repository.dart';
import 'applications_controller.dart';

/// Detail view + approve/reject actions for a single application.
///
/// Phase 5 scope: the review workflow's UI. All business rules
/// (who can review, what a decision requires, state-transition
/// enforcement) live on the backend — this screen just calls the
/// endpoint and surfaces whatever it returns.
class ApplicationReviewDetailScreen extends ConsumerStatefulWidget {
  const ApplicationReviewDetailScreen({required this.applicationId, super.key});

  final String applicationId;

  @override
  ConsumerState<ApplicationReviewDetailScreen> createState() =>
      _ApplicationReviewDetailScreenState();
}

class _ApplicationReviewDetailScreenState
    extends ConsumerState<ApplicationReviewDetailScreen> {
  late Future<LoanApplication> _future;
  final _interestRateController = TextEditingController();
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _interestRateController.dispose();
    super.dispose();
  }

  Future<LoanApplication> _load() async {
    final result = await getIt<LoanApplicationRepository>()
        .getApplication(widget.applicationId);
    return result.when(
        success: (data) => data, failure: (error) => throw error);
  }

  Future<void> _approve() async {
    final rate = double.tryParse(_interestRateController.text);
    if (rate == null || rate <= 0) {
      setState(() => _errorMessage = 'Enter a valid interest rate.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final result = await getIt<LoanApplicationRepository>().approve(
      id: widget.applicationId,
      interestRate: rate,
    );

    if (!mounted) return;
    result.when(
      success: (_) {
        setState(() {
          _isSubmitting = false;
          _future = _load();
        });
        ref.read(applicationsControllerProvider.notifier).refresh();
      },
      failure: (error) => setState(() {
        _isSubmitting = false;
        _errorMessage = error.message;
      }),
    );
  }

  Future<void> _reject() async {
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final result =
        await getIt<LoanApplicationRepository>().reject(widget.applicationId);

    if (!mounted) return;
    result.when(
      success: (_) {
        setState(() {
          _isSubmitting = false;
          _future = _load();
        });
        ref.read(applicationsControllerProvider.notifier).refresh();
      },
      failure: (error) => setState(() {
        _isSubmitting = false;
        _errorMessage = error.message;
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Review application')),
      body: FutureBuilder<LoanApplication>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
                child: Text('Could not load application: ${snapshot.error}'));
          }

          final application = snapshot.data!;
          final isDecided = application.status != 'submitted' &&
              application.status != 'under_review';
          final category = application.categoryId != null
              ? findLoanCategory(application.categoryId!)
              : null;

          return Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(Formatters.currency(application.requestedAmount),
                    style: textTheme.headlineMedium),
                const SizedBox(height: 8),
                Text('Term: ${application.requestedTermMonths} months',
                    style: textTheme.bodyMedium),
                Text('Status: ${application.status}',
                    style: textTheme.bodyMedium),
                if (category != null)
                  Text('Loan type: ${category.title}',
                      style: textTheme.bodyMedium),
                if (application.purpose != null)
                  Text('Purpose: ${application.purpose}',
                      style: textTheme.bodyMedium),
                const SizedBox(height: 24),
                if (!isDecided) ...[
                  TextField(
                    controller: _interestRateController,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      labelText: 'Interest rate (%) — required to approve',
                      helperText: category != null
                          ? 'Indicative range for ${category.title}: '
                              '${category.indicativeRateMin}–${category.indicativeRateMax}% p.a.'
                          : null,
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 8),
                    Text(_errorMessage!,
                        style: TextStyle(
                            color: Theme.of(context).colorScheme.error)),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _isSubmitting ? null : _reject,
                          child: const Text('Reject'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _isSubmitting ? null : _approve,
                          child: _isSubmitting
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Text('Approve'),
                        ),
                      ),
                    ],
                  ),
                ] else
                  Text('This application has already been decided.',
                      style: textTheme.bodyMedium),
              ],
            ),
          );
        },
      ),
    );
  }
}
