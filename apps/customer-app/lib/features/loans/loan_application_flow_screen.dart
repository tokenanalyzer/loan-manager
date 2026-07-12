import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/formatters.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/primary_button.dart';
import 'loan_application_flow_controller.dart';
import 'loan_categories.dart';

/// Steps 2-4 of the loan journey: the multi-step application form,
/// review & confirmation, and submission. See
/// `LoanApplicationFlowController` for the wizard state machine.
class LoanApplicationFlowScreen extends ConsumerWidget {
  const LoanApplicationFlowScreen({this.categoryId, super.key});

  final String? categoryId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = loanApplicationFlowControllerProvider(categoryId);
    final state = ref.watch(provider);
    final controller = ref.read(provider.notifier);
    final category = categoryId != null ? findLoanCategory(categoryId!) : null;

    return Scaffold(
      appBar: AppBar(
        title: Text(category?.title ?? 'Loan application'),
        leading: state.step == LoanApplicationStep.amountAndTerm
            ? null
            : IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: controller.previousStep,
              ),
      ),
      body: Column(
        children: [
          _StepIndicator(step: state.step),
          Expanded(
            child: switch (state.step) {
              LoanApplicationStep.amountAndTerm => _AmountAndTermStep(
                  category: category,
                  controller: controller,
                  state: state,
                ),
              LoanApplicationStep.purpose =>
                _PurposeStep(controller: controller, state: state),
              LoanApplicationStep.review => _ReviewStep(
                  category: category,
                  controller: controller,
                  state: state,
                ),
            },
          ),
        ],
      ),
    );
  }
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.step});

  final LoanApplicationStep step;

  @override
  Widget build(BuildContext context) {
    final labels = ['Amount', 'Details', 'Review'];
    final activeIndex = LoanApplicationStep.values.indexOf(step);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: List.generate(labels.length, (index) {
          final isActive = index <= activeIndex;
          return Expanded(
            child: Container(
              margin:
                  EdgeInsets.only(right: index == labels.length - 1 ? 0 : 6),
              height: 4,
              decoration: BoxDecoration(
                color: isActive
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _AmountAndTermStep extends StatefulWidget {
  const _AmountAndTermStep(
      {required this.category, required this.controller, required this.state});

  final LoanCategory? category;
  final LoanApplicationFlowController controller;
  final LoanApplicationFormState state;

  @override
  State<_AmountAndTermStep> createState() => _AmountAndTermStepState();
}

class _AmountAndTermStepState extends State<_AmountAndTermStep> {
  final _formKey = GlobalKey<FormState>();
  late final _amountController = TextEditingController(
    text: widget.state.amount?.toStringAsFixed(0) ?? '',
  );
  late final _termController = TextEditingController(
    text: widget.state.termMonths?.toString() ?? '',
  );

  @override
  void dispose() {
    _amountController.dispose();
    _termController.dispose();
    super.dispose();
  }

  void _continue() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    widget.controller.setAmount(double.parse(_amountController.text));
    widget.controller.setTerm(int.parse(_termController.text));
    widget.controller.nextStep();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: ListView(
          children: [
            Text('How much do you need?',
                style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 16),
            TextFormField(
              controller: _amountController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Requested amount',
                prefixText: '\$ ',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                final amount = double.tryParse(value ?? '');
                if (amount == null || amount <= 0)
                  return 'Enter a valid amount.';
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
                if (months == null || months <= 0)
                  return 'Enter a valid number of months.';
                return null;
              },
            ),
            const SizedBox(height: 24),
            PrimaryButton(label: 'Continue', onPressed: _continue),
          ],
        ),
      ),
    );
  }
}

class _PurposeStep extends StatefulWidget {
  const _PurposeStep({required this.controller, required this.state});

  final LoanApplicationFlowController controller;
  final LoanApplicationFormState state;

  @override
  State<_PurposeStep> createState() => _PurposeStepState();
}

class _PurposeStepState extends State<_PurposeStep> {
  late final _purposeController =
      TextEditingController(text: widget.state.purpose ?? '');

  @override
  void dispose() {
    _purposeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: ListView(
        children: [
          Text("What's this for?",
              style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(
            'Optional, but helps us review your application faster.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _purposeController,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Purpose (optional)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),
          PrimaryButton(
            label: 'Continue',
            onPressed: () {
              widget.controller.setPurpose(_purposeController.text.trim());
              widget.controller.nextStep();
            },
          ),
        ],
      ),
    );
  }
}

class _ReviewStep extends StatelessWidget {
  const _ReviewStep(
      {required this.category, required this.controller, required this.state});

  final LoanCategory? category;
  final LoanApplicationFlowController controller;
  final LoanApplicationFormState state;

  Future<void> _submit(BuildContext context) async {
    final applicationId = await controller.submit();
    if (applicationId != null && context.mounted) {
      context.go('/loans/apply/success', extra: applicationId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: ListView(
        children: [
          Text('Review your application', style: textTheme.headlineSmall),
          const SizedBox(height: 16),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ReviewRow(
                    label: 'Loan type', value: category?.title ?? 'General'),
                _ReviewRow(
                  label: 'Amount',
                  value: Formatters.currency(state.amount!.toStringAsFixed(2)),
                ),
                _ReviewRow(label: 'Term', value: '${state.termMonths} months'),
                if (state.purpose != null && state.purpose!.isNotEmpty)
                  _ReviewRow(label: 'Purpose', value: state.purpose!),
              ],
            ),
          ),
          if (state.errorMessage != null) ...[
            const SizedBox(height: 16),
            Text(state.errorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 24),
          PrimaryButton(
            label: 'Submit application',
            isLoading: state.isSubmitting,
            onPressed: () => _submit(context),
          ),
        ],
      ),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
              width: 100,
              child: Text(label, style: Theme.of(context).textTheme.bodySmall)),
          Expanded(
              child: Text(value, style: Theme.of(context).textTheme.bodyLarge)),
        ],
      ),
    );
  }
}
