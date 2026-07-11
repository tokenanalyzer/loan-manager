import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/di/injection.dart';
import '../../core/network/loan_application_repository.dart';

/// Loan application submission form.
///
/// Phase 5 scope: a single form (amount, term, purpose) submitting to
/// the backend, which owns all validation/business rules — this
/// screen only surfaces whatever error message the backend returns.
class LoanApplicationFormScreen extends StatefulWidget {
  const LoanApplicationFormScreen({super.key});

  @override
  State<LoanApplicationFormScreen> createState() => _LoanApplicationFormScreenState();
}

class _LoanApplicationFormScreenState extends State<LoanApplicationFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _termController = TextEditingController();
  final _purposeController = TextEditingController();
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _amountController.dispose();
    _termController.dispose();
    _purposeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final result = await getIt<LoanApplicationRepository>().submit(
      requestedAmount: double.parse(_amountController.text),
      requestedTermMonths: int.parse(_termController.text),
      purpose: _purposeController.text.trim().isEmpty ? null : _purposeController.text.trim(),
    );

    if (!mounted) return;

    result.when(
      success: (_) {
        setState(() => _isSubmitting = false);
        context.go('/loans');
      },
      failure: (error) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = error.message;
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Apply for a loan')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              Text('Loan details', style: textTheme.headlineMedium),
              const SizedBox(height: 16),
              TextFormField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Requested amount',
                  prefixText: '\$ ',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  final amount = double.tryParse(value ?? '');
                  if (amount == null || amount <= 0) {
                    return 'Enter a valid amount.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _termController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Term (months)',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  final months = int.tryParse(value ?? '');
                  if (months == null || months <= 0) {
                    return 'Enter a valid number of months.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _purposeController,
                decoration: const InputDecoration(
                  labelText: 'Purpose (optional)',
                  border: OutlineInputBorder(),
                ),
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: 12),
                Text(_errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Submit application'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
