import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/constants/application_wizard_steps.dart';
import '../../core/constants/indian_states.dart';
import '../../core/constants/profile_options.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/loan_cost_breakdown_card.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/state_views.dart';
import '../documents/documents_checklist.dart';
import '../documents/documents_controller.dart';
import '../home/home_controller.dart';
import '../profile/profile_providers.dart';
import 'loan_application_flow_controller.dart';

/// The full loan-application wizard — steps 1-10 of the sprint spec,
/// tailored per loan category (see `stepsForCategory`). Every field
/// collected maps to a real, persisted `CustomerProfile` column or the
/// loan application itself (see `loan_application_flow_controller.dart`).
class LoanApplicationFlowScreen extends ConsumerWidget {
  const LoanApplicationFlowScreen({this.categoryId, super.key});

  final String? categoryId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = loanApplicationFlowControllerProvider(categoryId);
    final state = ref.watch(provider);
    final controller = ref.read(provider.notifier);
    final category = categoryId != null ? findLoanCategory(categoryId!) : null;

    final overviewAsync = ref.watch(profileOverviewProvider);
    final isKycComplete =
        overviewAsync.valueOrNull?.customerProfile?.isKycComplete ?? false;

    if (overviewAsync.isLoading) {
      return const Scaffold(body: LoadingView());
    }

    if (!isKycComplete) {
      return Scaffold(
        appBar: AppBar(title: Text(category?.title ?? 'Loan application')),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.badge_outlined, size: 56),
              const SizedBox(height: 16),
              Text(
                'Complete your KYC to apply',
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Add your PAN and Aadhaar details in your profile before applying for a loan.',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              PrimaryButton(
                label: 'Complete KYC',
                onPressed: () => context.push('/profile/edit'),
              ),
            ],
          ),
        ),
      );
    }

    return PopScope(
      // Mirrors AppShell's own PopScope: the hardware back button must
      // behave exactly like the visible back arrow below (step back,
      // not abandon the whole application) — without this, Android's
      // back button popped the entire route from any step, discarding
      // every field the customer had entered.
      canPop: state.isFirstStep,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        controller.previousStep();
      },
      child: Scaffold(
      appBar: AppBar(
        title: Text(category?.title ?? 'Loan application'),
        leading: state.isFirstStep
            ? null
            : IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: controller.previousStep,
              ),
      ),
      body: Column(
        children: [
          if (state.isFirstStep) _ApplicationHeader(category: category),
          _StepProgress(steps: state.steps, stepIndex: state.stepIndex),
          Expanded(
            child: switch (state.currentStep) {
              WizardStep.personal => _PersonalStep(controller: controller, state: state),
              WizardStep.address => _AddressStep(controller: controller, state: state),
              WizardStep.employment => _EmploymentStep(controller: controller, state: state),
              WizardStep.income => _IncomeStep(controller: controller, state: state),
              WizardStep.existingLoans =>
                _ExistingLoansStep(controller: controller, state: state),
              WizardStep.propertyDetails =>
                _PropertyDetailsStep(controller: controller, state: state),
              WizardStep.loanRequirement => _LoanRequirementStep(
                  category: category, controller: controller, state: state),
              WizardStep.nominee => _NomineeStep(controller: controller, state: state),
              WizardStep.references => _ReferencesStep(controller: controller, state: state),
              WizardStep.documents =>
                _DocumentsStep(controller: controller, categoryId: categoryId),
              WizardStep.review =>
                _ReviewStep(category: category, controller: controller, state: state),
            },
          ),
        ],
      ),
      ),
    );
  }
}

/// Compact header shown only on the wizard's first step — the product
/// name/description now that `LoanDetailsScreen` no longer sits in
/// front of this form, plus the low-emphasis lender disclaimer. Kept
/// off subsequent steps so the progress bar and first field of each
/// step stay right under the app bar, unpadded by repeated content.
class _ApplicationHeader extends StatelessWidget {
  const _ApplicationHeader({required this.category});

  final LoanCategory? category;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mutedStyle = theme.textTheme.bodySmall?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (category != null) ...[
            Text(category!.title, style: theme.textTheme.titleMedium),
            const SizedBox(height: 2),
            Text(
              category!.description,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: mutedStyle,
            ),
            const SizedBox(height: 6),
          ],
          Text(
            'Final loan terms, eligibility and charges are determined by the '
            'partner lender after application review.',
            style: mutedStyle?.copyWith(fontStyle: FontStyle.italic),
          ),
        ],
      ),
    );
  }
}

/// Compact single-bar progress indicator — deliberately not one
/// fixed-width segment per step (last sprint's 3-step design) since
/// the step count now varies 6-10 by category; a bar + "Step X of N ·
/// Label" caption scales to any length without ever overflowing.
class _StepProgress extends StatelessWidget {
  const _StepProgress({required this.steps, required this.stepIndex});

  final List<WizardStep> steps;
  final int stepIndex;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = (stepIndex + 1) / steps.length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: progress),
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              builder: (context, animated, _) =>
                  LinearProgressIndicator(value: animated, minHeight: 5),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Step ${stepIndex + 1} of ${steps.length} · ${steps[stepIndex].label}',
            style: theme.textTheme.labelSmall,
          ),
        ],
      ),
    );
  }
}

class _StepBody extends StatelessWidget {
  const _StepBody({required this.formKey, required this.children});

  final GlobalKey<FormState> formKey;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: formKey,
        child: ListView(children: children),
      ),
    );
  }
}

class _StepHeading extends StatelessWidget {
  const _StepHeading({required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: textTheme.headlineSmall),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(subtitle!, style: textTheme.bodyMedium),
          ],
        ],
      ),
    );
  }
}

// --- Step 1: Personal ---

class _PersonalStep extends StatefulWidget {
  const _PersonalStep({required this.controller, required this.state});

  final LoanApplicationFlowController controller;
  final LoanApplicationFormState state;

  @override
  State<_PersonalStep> createState() => _PersonalStepState();
}

class _PersonalStepState extends State<_PersonalStep> {
  final _formKey = GlobalKey<FormState>();
  late String? _dateOfBirth = widget.state.dateOfBirth;
  late String? _gender = widget.state.gender;
  late String? _maritalStatus = widget.state.maritalStatus;
  late final _fatherNameController = TextEditingController(text: widget.state.fatherName ?? '');
  late final _motherNameController = TextEditingController(text: widget.state.motherName ?? '');

  @override
  void dispose() {
    _fatherNameController.dispose();
    _motherNameController.dispose();
    super.dispose();
  }

  Future<void> _pickDateOfBirth() async {
    final now = DateTime.now();
    final initial = _dateOfBirth != null ? DateTime.tryParse(_dateOfBirth!) : null;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial ?? DateTime(now.year - 25),
      firstDate: DateTime(now.year - 100),
      lastDate: DateTime(now.year - 18, now.month, now.day),
    );
    if (picked != null) {
      setState(() => _dateOfBirth = picked.toIso8601String().split('T').first);
    }
  }

  void _continue() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_dateOfBirth == null || _gender == null || _maritalStatus == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please complete date of birth, gender, and marital status.')),
      );
      return;
    }
    widget.controller.updatePersonal(
      dateOfBirth: _dateOfBirth,
      gender: _gender,
      maritalStatus: _maritalStatus,
      fatherName: _fatherNameController.text.trim().isEmpty
          ? null
          : _fatherNameController.text.trim(),
      motherName: _motherNameController.text.trim().isEmpty
          ? null
          : _motherNameController.text.trim(),
    );
    widget.controller.nextStep();
  }

  @override
  Widget build(BuildContext context) {
    return _StepBody(
      formKey: _formKey,
      children: [
        const _StepHeading(
          title: 'Personal details',
          subtitle: 'Used for identity verification during review.',
        ),
        InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: _pickDateOfBirth,
          child: InputDecorator(
            decoration: const InputDecoration(labelText: 'Date of birth'),
            child: Text(_dateOfBirth ?? 'Select date',
                style: Theme.of(context).textTheme.bodyLarge),
          ),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _gender,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Gender'),
          items: [for (final g in kGenderOptions) DropdownMenuItem(value: g, child: Text(g))],
          onChanged: (value) => setState(() => _gender = value),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _maritalStatus,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Marital status'),
          items: [
            for (final m in kMaritalStatusOptions) DropdownMenuItem(value: m, child: Text(m)),
          ],
          onChanged: (value) => setState(() => _maritalStatus = value),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _fatherNameController,
          decoration: const InputDecoration(labelText: "Father's name"),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _motherNameController,
          decoration: const InputDecoration(labelText: "Mother's name (optional)"),
        ),
        const SizedBox(height: 24),
        PrimaryButton(label: 'Continue', onPressed: _continue),
      ],
    );
  }
}

// --- Step 2: Address ---

class _AddressStep extends StatefulWidget {
  const _AddressStep({required this.controller, required this.state});

  final LoanApplicationFlowController controller;
  final LoanApplicationFormState state;

  @override
  State<_AddressStep> createState() => _AddressStepState();
}

class _AddressStepState extends State<_AddressStep> {
  final _formKey = GlobalKey<FormState>();
  late final _addressController = TextEditingController(text: widget.state.addressLine1 ?? '');
  late final _cityController = TextEditingController(text: widget.state.city ?? '');
  late final _postalCodeController = TextEditingController(text: widget.state.postalCode ?? '');
  late final _yearsController =
      TextEditingController(text: widget.state.yearsAtCurrentAddress?.toString() ?? '');
  late final _permanentAddressController =
      TextEditingController(text: widget.state.permanentAddress ?? '');
  late String? _state = widget.state.state;
  late String? _residenceType = widget.state.residenceType;
  bool _sameAsCurrent = false;

  @override
  void dispose() {
    _addressController.dispose();
    _cityController.dispose();
    _postalCodeController.dispose();
    _yearsController.dispose();
    _permanentAddressController.dispose();
    super.dispose();
  }

  void _continue() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_state == null || _residenceType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select your state and residence type.')),
      );
      return;
    }
    widget.controller.updateAddress(
      addressLine1: _addressController.text.trim(),
      city: _cityController.text.trim(),
      state: _state,
      postalCode: _postalCodeController.text.trim(),
      residenceType: _residenceType,
      yearsAtCurrentAddress: int.tryParse(_yearsController.text),
      permanentAddress: _sameAsCurrent
          ? _addressController.text.trim()
          : (_permanentAddressController.text.trim().isEmpty
              ? null
              : _permanentAddressController.text.trim()),
    );
    widget.controller.nextStep();
  }

  @override
  Widget build(BuildContext context) {
    return _StepBody(
      formKey: _formKey,
      children: [
        const _StepHeading(title: 'Address'),
        TextFormField(
          controller: _addressController,
          decoration: const InputDecoration(labelText: 'Current address'),
          validator: (value) =>
              (value == null || value.trim().isEmpty) ? 'Enter your address.' : null,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _cityController,
          decoration: const InputDecoration(labelText: 'City'),
          validator: (value) =>
              (value == null || value.trim().isEmpty) ? 'Enter your city.' : null,
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _state,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'State'),
          items: [
            for (final s in kIndianStatesAndUnionTerritories)
              DropdownMenuItem(value: s, child: Text(s)),
          ],
          onChanged: (value) => setState(() => _state = value),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _postalCodeController,
          keyboardType: TextInputType.number,
          maxLength: 6,
          decoration: const InputDecoration(labelText: 'PIN code', counterText: ''),
          validator: (value) {
            if (value == null || !RegExp(r'^[1-9][0-9]{5}$').hasMatch(value)) {
              return 'Enter a valid 6-digit PIN code.';
            }
            return null;
          },
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _residenceType,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Residence type'),
          items: [
            for (final r in kResidenceTypeOptions) DropdownMenuItem(value: r, child: Text(r)),
          ],
          onChanged: (value) => setState(() => _residenceType = value),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _yearsController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Years at current address (optional)'),
        ),
        const SizedBox(height: 20),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          value: _sameAsCurrent,
          title: const Text('Permanent address same as current'),
          onChanged: (value) => setState(() => _sameAsCurrent = value ?? false),
        ),
        if (!_sameAsCurrent)
          TextFormField(
            controller: _permanentAddressController,
            decoration: const InputDecoration(labelText: 'Permanent address (optional)'),
          ),
        const SizedBox(height: 24),
        PrimaryButton(label: 'Continue', onPressed: _continue),
      ],
    );
  }
}

// --- Step 3: Employment ---

class _EmploymentStep extends StatefulWidget {
  const _EmploymentStep({required this.controller, required this.state});

  final LoanApplicationFlowController controller;
  final LoanApplicationFormState state;

  @override
  State<_EmploymentStep> createState() => _EmploymentStepState();
}

class _EmploymentStepState extends State<_EmploymentStep> {
  final _formKey = GlobalKey<FormState>();
  late final _companyController = TextEditingController(text: widget.state.companyName ?? '');
  late final _designationController =
      TextEditingController(text: widget.state.designation ?? '');
  late final _officeAddressController =
      TextEditingController(text: widget.state.officeAddress ?? '');
  late final _officePhoneController = TextEditingController(text: widget.state.officePhone ?? '');
  late String? _employmentStatus = widget.state.employmentStatus;
  late String? _joiningDate = widget.state.joiningDate;

  @override
  void dispose() {
    _companyController.dispose();
    _designationController.dispose();
    _officeAddressController.dispose();
    _officePhoneController.dispose();
    super.dispose();
  }

  Future<void> _pickJoiningDate() async {
    final now = DateTime.now();
    final initial = _joiningDate != null ? DateTime.tryParse(_joiningDate!) : null;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial ?? now,
      firstDate: DateTime(now.year - 60),
      lastDate: now,
    );
    if (picked != null) {
      setState(() => _joiningDate = picked.toIso8601String().split('T').first);
    }
  }

  void _continue() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_employmentStatus == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Please select your employment status.')));
      return;
    }
    widget.controller.updateEmployment(
      employmentStatus: _employmentStatus,
      companyName: _companyController.text.trim().isEmpty ? null : _companyController.text.trim(),
      designation:
          _designationController.text.trim().isEmpty ? null : _designationController.text.trim(),
      joiningDate: _joiningDate,
      officeAddress: _officeAddressController.text.trim().isEmpty
          ? null
          : _officeAddressController.text.trim(),
      officePhone:
          _officePhoneController.text.trim().isEmpty ? null : _officePhoneController.text.trim(),
    );
    widget.controller.nextStep();
  }

  @override
  Widget build(BuildContext context) {
    return _StepBody(
      formKey: _formKey,
      children: [
        const _StepHeading(title: 'Employment'),
        DropdownButtonFormField<String>(
          initialValue: _employmentStatus,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Employment type'),
          items: [
            for (final s in kEmploymentStatusOptions) DropdownMenuItem(value: s, child: Text(s)),
          ],
          onChanged: (value) => setState(() => _employmentStatus = value),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _companyController,
          decoration: const InputDecoration(labelText: 'Company name (optional)'),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _designationController,
          decoration: const InputDecoration(labelText: 'Designation (optional)'),
        ),
        const SizedBox(height: 12),
        InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: _pickJoiningDate,
          child: InputDecorator(
            decoration: const InputDecoration(labelText: 'Joining date (optional)'),
            child: Text(_joiningDate ?? 'Select date',
                style: Theme.of(context).textTheme.bodyLarge),
          ),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _officeAddressController,
          decoration: const InputDecoration(labelText: 'Office address (optional)'),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _officePhoneController,
          keyboardType: TextInputType.phone,
          maxLength: 10,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration:
              const InputDecoration(labelText: 'Office phone (optional)', counterText: ''),
          validator: (value) {
            if (value == null || value.isEmpty) return null;
            if (!RegExp(r'^[6-9][0-9]{9}$').hasMatch(value)) {
              return 'Enter a valid 10-digit phone number.';
            }
            return null;
          },
        ),
        const SizedBox(height: 24),
        PrimaryButton(label: 'Continue', onPressed: _continue),
      ],
    );
  }
}

// --- Step 4: Income ---

class _IncomeStep extends StatefulWidget {
  const _IncomeStep({required this.controller, required this.state});

  final LoanApplicationFlowController controller;
  final LoanApplicationFormState state;

  @override
  State<_IncomeStep> createState() => _IncomeStepState();
}

class _IncomeStepState extends State<_IncomeStep> {
  final _formKey = GlobalKey<FormState>();
  late final _monthlyIncomeController =
      TextEditingController(text: widget.state.monthlyIncome?.toStringAsFixed(0) ?? '');
  late final _additionalIncomeController =
      TextEditingController(text: widget.state.additionalIncome?.toStringAsFixed(0) ?? '');
  late final _bankAccountController =
      TextEditingController(text: widget.state.bankAccountNumber ?? '');
  late final _bankIfscController = TextEditingController(text: widget.state.bankIfscCode ?? '');
  late final _bankHolderController =
      TextEditingController(text: widget.state.bankAccountHolderName ?? '');

  @override
  void dispose() {
    _monthlyIncomeController.dispose();
    _additionalIncomeController.dispose();
    _bankAccountController.dispose();
    _bankIfscController.dispose();
    _bankHolderController.dispose();
    super.dispose();
  }

  void _continue() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    widget.controller.updateIncome(
      monthlyIncome: double.tryParse(_monthlyIncomeController.text),
      additionalIncome: double.tryParse(_additionalIncomeController.text),
      bankAccountNumber:
          _bankAccountController.text.trim().isEmpty ? null : _bankAccountController.text.trim(),
      bankIfscCode: _bankIfscController.text.trim().isEmpty
          ? null
          : _bankIfscController.text.trim().toUpperCase(),
      bankAccountHolderName:
          _bankHolderController.text.trim().isEmpty ? null : _bankHolderController.text.trim(),
    );
    widget.controller.nextStep();
  }

  @override
  Widget build(BuildContext context) {
    return _StepBody(
      formKey: _formKey,
      children: [
        const _StepHeading(title: 'Income', subtitle: 'Where your loan is disbursed, once approved.'),
        TextFormField(
          controller: _monthlyIncomeController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Monthly salary', prefixText: '₹ '),
          validator: (value) {
            final amount = double.tryParse(value ?? '');
            if (amount == null || amount <= 0) return 'Enter a valid monthly income.';
            return null;
          },
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _additionalIncomeController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration:
              const InputDecoration(labelText: 'Additional income (optional)', prefixText: '₹ '),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _bankAccountController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Bank account number (optional)'),
          validator: (value) {
            if (value == null || value.isEmpty) return null;
            if (!RegExp(r'^[0-9]{9,18}$').hasMatch(value)) {
              return 'Enter a valid 9-18 digit account number.';
            }
            return null;
          },
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _bankIfscController,
          textCapitalization: TextCapitalization.characters,
          maxLength: 11,
          decoration: const InputDecoration(
              labelText: 'IFSC code (optional)', hintText: 'HDFC0001234', counterText: ''),
          validator: (value) {
            if (value == null || value.isEmpty) return null;
            if (!RegExp(r'^[A-Za-z]{4}0[A-Za-z0-9]{6}$').hasMatch(value)) {
              return 'Enter a valid IFSC code (e.g. HDFC0001234).';
            }
            return null;
          },
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _bankHolderController,
          decoration: const InputDecoration(labelText: 'Account holder name (optional)'),
        ),
        const SizedBox(height: 24),
        PrimaryButton(label: 'Continue', onPressed: _continue),
      ],
    );
  }
}

// --- Step 5: Existing loans ---

class _ExistingLoansStep extends StatefulWidget {
  const _ExistingLoansStep({required this.controller, required this.state});

  final LoanApplicationFlowController controller;
  final LoanApplicationFormState state;

  @override
  State<_ExistingLoansStep> createState() => _ExistingLoansStepState();
}

class _ExistingLoansStepState extends State<_ExistingLoansStep> {
  late final _emiController =
      TextEditingController(text: widget.state.currentMonthlyEmi?.toStringAsFixed(0) ?? '');
  late final _cardCountController =
      TextEditingController(text: widget.state.creditCardCount?.toString() ?? '');
  late final _cardOutstandingController = TextEditingController(
      text: widget.state.creditCardOutstanding?.toStringAsFixed(0) ?? '');
  late final _loansOutstandingController = TextEditingController(
      text: widget.state.existingLoansOutstanding?.toStringAsFixed(0) ?? '');

  @override
  void dispose() {
    _emiController.dispose();
    _cardCountController.dispose();
    _cardOutstandingController.dispose();
    _loansOutstandingController.dispose();
    super.dispose();
  }

  void _continue() {
    widget.controller.updateExistingLoans(
      currentMonthlyEmi: double.tryParse(_emiController.text),
      creditCardCount: int.tryParse(_cardCountController.text),
      creditCardOutstanding: double.tryParse(_cardOutstandingController.text),
      existingLoansOutstanding: double.tryParse(_loansOutstandingController.text),
    );
    widget.controller.nextStep();
  }

  @override
  Widget build(BuildContext context) {
    return _StepBody(
      formKey: GlobalKey<FormState>(),
      children: [
        const _StepHeading(
          title: 'Existing loans',
          subtitle: 'Leave blank if none — helps us assess your repayment capacity.',
        ),
        TextFormField(
          controller: _emiController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration:
              const InputDecoration(labelText: 'Current monthly EMI (optional)', prefixText: '₹ '),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _cardCountController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Number of credit cards (optional)'),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _cardOutstandingController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
              labelText: 'Credit card outstanding (optional)', prefixText: '₹ '),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _loansOutstandingController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
              labelText: 'Other outstanding loans (optional)', prefixText: '₹ '),
        ),
        const SizedBox(height: 24),
        PrimaryButton(label: 'Continue', onPressed: _continue),
      ],
    );
  }
}

// --- Step: Property details (LAP only) ---

class _PropertyDetailsStep extends StatefulWidget {
  const _PropertyDetailsStep({required this.controller, required this.state});

  final LoanApplicationFlowController controller;
  final LoanApplicationFormState state;

  @override
  State<_PropertyDetailsStep> createState() => _PropertyDetailsStepState();
}

class _PropertyDetailsStepState extends State<_PropertyDetailsStep> {
  late String? _propertyType = widget.state.propertyType;
  late String? _propertyOwnership = widget.state.propertyOwnership;
  late final _addressController =
      TextEditingController(text: widget.state.propertyAddress ?? '');
  late final _valueController =
      TextEditingController(text: widget.state.propertyValue?.toStringAsFixed(0) ?? '');
  late bool _hasExistingLoan = widget.state.hasExistingLoanOnProperty ?? false;
  late final _outstandingController = TextEditingController(
      text: widget.state.existingLoanOutstandingAmount?.toStringAsFixed(0) ?? '');

  @override
  void dispose() {
    _addressController.dispose();
    _valueController.dispose();
    _outstandingController.dispose();
    super.dispose();
  }

  void _continue() {
    if (_propertyType == null || _propertyOwnership == null ||
        _addressController.text.trim().isEmpty ||
        double.tryParse(_valueController.text) == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Please fill in the property type, ownership, address, and value.')),
      );
      return;
    }
    widget.controller.updatePropertyDetails(
      propertyType: _propertyType,
      propertyOwnership: _propertyOwnership,
      propertyAddress: _addressController.text.trim(),
      propertyValue: double.tryParse(_valueController.text),
      hasExistingLoanOnProperty: _hasExistingLoan,
      existingLoanOutstandingAmount:
          _hasExistingLoan ? double.tryParse(_outstandingController.text) : null,
    );
    widget.controller.nextStep();
  }

  @override
  Widget build(BuildContext context) {
    return _StepBody(
      formKey: GlobalKey<FormState>(),
      children: [
        const _StepHeading(
          title: 'Property details',
          subtitle: 'Tell us about the property you\'re borrowing against.',
        ),
        DropdownButtonFormField<String>(
          initialValue: _propertyType,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Property type'),
          items: [
            for (final t in kPropertyTypeOptions) DropdownMenuItem(value: t, child: Text(t)),
          ],
          onChanged: (value) => setState(() => _propertyType = value),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _propertyOwnership,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Property ownership'),
          items: [
            for (final o in kPropertyOwnershipOptions) DropdownMenuItem(value: o, child: Text(o)),
          ],
          onChanged: (value) => setState(() => _propertyOwnership = value),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _addressController,
          decoration: const InputDecoration(labelText: 'Property address'),
          maxLines: 2,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _valueController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Property value', prefixText: '₹ '),
        ),
        const SizedBox(height: 20),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          value: _hasExistingLoan,
          title: const Text('There is an existing loan on this property'),
          onChanged: (value) => setState(() => _hasExistingLoan = value ?? false),
        ),
        if (_hasExistingLoan)
          TextFormField(
            controller: _outstandingController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration:
                const InputDecoration(labelText: 'Outstanding amount', prefixText: '₹ '),
          ),
        const SizedBox(height: 24),
        PrimaryButton(label: 'Continue', onPressed: _continue),
      ],
    );
  }
}

// --- Step 6: Loan requirement (amount/tenure/purpose) ---

class _LoanRequirementStep extends StatefulWidget {
  const _LoanRequirementStep(
      {required this.category, required this.controller, required this.state});

  final LoanCategory? category;
  final LoanApplicationFlowController controller;
  final LoanApplicationFormState state;

  @override
  State<_LoanRequirementStep> createState() => _LoanRequirementStepState();
}

class _LoanRequirementStepState extends State<_LoanRequirementStep> {
  final _formKey = GlobalKey<FormState>();
  late final _amountController =
      TextEditingController(text: widget.state.amount?.toStringAsFixed(0) ?? '');
  late final _termController =
      TextEditingController(text: widget.state.termMonths?.toString() ?? '');
  late final _purposeController = TextEditingController(text: widget.state.purpose ?? '');

  @override
  void dispose() {
    _amountController.dispose();
    _termController.dispose();
    _purposeController.dispose();
    super.dispose();
  }

  void _continue() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    widget.controller.setAmount(double.parse(_amountController.text));
    widget.controller.setTerm(int.parse(_termController.text));
    widget.controller.setPurpose(_purposeController.text.trim());
    widget.controller.nextStep();
  }

  @override
  Widget build(BuildContext context) {
    return _StepBody(
      formKey: _formKey,
      children: [
        const _StepHeading(title: 'How much do you need?'),
        TextFormField(
          controller: _amountController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Requested amount', prefixText: '₹ '),
          validator: (value) {
            final amount = double.tryParse(value ?? '');
            if (amount == null || amount <= 0) return 'Enter a valid amount.';
            final category = widget.category;
            if (category != null &&
                (amount < category.minAmount || amount > category.maxAmount)) {
              return 'Enter an amount between '
                  '${Formatters.currency(category.minAmount.toStringAsFixed(2))} and '
                  '${Formatters.currency(category.maxAmount.toStringAsFixed(2))}.';
            }
            return null;
          },
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _termController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Term (months)'),
          validator: (value) {
            final months = int.tryParse(value ?? '');
            if (months == null || months <= 0) return 'Enter a valid number of months.';
            final category = widget.category;
            if (category != null &&
                (months < category.minTermMonths || months > category.maxTermMonths)) {
              return 'Enter a term between ${category.minTermMonths} and '
                  '${category.maxTermMonths} months.';
            }
            return null;
          },
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _purposeController,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Purpose (optional)'),
        ),
        const SizedBox(height: 16),
        AnimatedBuilder(
          animation: Listenable.merge([_amountController, _termController]),
          builder: (context, _) {
            final amount = double.tryParse(_amountController.text);
            final months = int.tryParse(_termController.text);

            Widget child;
            if (amount == null || amount <= 0 || months == null || months <= 0) {
              child = const SizedBox.shrink();
            } else {
              final category = widget.category;
              final rate = category?.indicativeRateMidpoint ?? 16;
              final breakdown = computeLoanCostBreakdown(
                principal: amount,
                annualRatePercent: rate,
                tenureMonths: months,
                processingFeePercent: category?.processingFeePercent ?? 0.02,
              );
              child = LoanCostBreakdownCard(
                key: const ValueKey('breakdown'),
                title: 'Estimated cost',
                breakdown: breakdown,
                tenureMonths: months,
                rateLabel: category != null
                    ? '${category.indicativeRateMin}–${category.indicativeRateMax}% p.a.'
                    : '~$rate% p.a.',
              );
            }

            return AnimatedSwitcher(duration: const Duration(milliseconds: 220), child: child);
          },
        ),
        const SizedBox(height: 24),
        PrimaryButton(label: 'Continue', onPressed: _continue),
      ],
    );
  }
}

// --- Step 7: Nominee ---

class _NomineeStep extends StatefulWidget {
  const _NomineeStep({required this.controller, required this.state});

  final LoanApplicationFlowController controller;
  final LoanApplicationFormState state;

  @override
  State<_NomineeStep> createState() => _NomineeStepState();
}

class _NomineeStepState extends State<_NomineeStep> {
  final _formKey = GlobalKey<FormState>();
  late final _nameController = TextEditingController(text: widget.state.nomineeName ?? '');
  late final _phoneController = TextEditingController(text: widget.state.nomineePhone ?? '');
  late String? _relationship = widget.state.nomineeRelationship;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _continue() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_relationship == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Please select the nominee relationship.')));
      return;
    }
    widget.controller.updateNominee(
      nomineeName: _nameController.text.trim(),
      nomineeRelationship: _relationship,
      nomineePhone: _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
    );
    widget.controller.nextStep();
  }

  @override
  Widget build(BuildContext context) {
    return _StepBody(
      formKey: _formKey,
      children: [
        const _StepHeading(
          title: 'Nominee',
          subtitle: 'Who we contact for your loan in an emergency.',
        ),
        TextFormField(
          controller: _nameController,
          decoration: const InputDecoration(labelText: 'Nominee name'),
          validator: (value) =>
              (value == null || value.trim().isEmpty) ? 'Enter a nominee name.' : null,
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _relationship,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Relationship'),
          items: [
            for (final r in kNomineeRelationshipOptions)
              DropdownMenuItem(value: r, child: Text(r)),
          ],
          onChanged: (value) => setState(() => _relationship = value),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          maxLength: 10,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration:
              const InputDecoration(labelText: 'Nominee phone (optional)', counterText: ''),
          validator: (value) {
            if (value == null || value.isEmpty) return null;
            if (!RegExp(r'^[6-9][0-9]{9}$').hasMatch(value)) {
              return 'Enter a valid 10-digit phone number.';
            }
            return null;
          },
        ),
        const SizedBox(height: 24),
        PrimaryButton(label: 'Continue', onPressed: _continue),
      ],
    );
  }
}

// --- Step 8: References ---

class _ReferencesStep extends StatefulWidget {
  const _ReferencesStep({required this.controller, required this.state});

  final LoanApplicationFlowController controller;
  final LoanApplicationFormState state;

  @override
  State<_ReferencesStep> createState() => _ReferencesStepState();
}

class _ReferencesStepState extends State<_ReferencesStep> {
  final _formKey = GlobalKey<FormState>();
  late final _r1NameController = TextEditingController(text: widget.state.reference1Name ?? '');
  late final _r1PhoneController = TextEditingController(text: widget.state.reference1Phone ?? '');
  late final _r1RelationshipController =
      TextEditingController(text: widget.state.reference1Relationship ?? '');
  late final _r2NameController = TextEditingController(text: widget.state.reference2Name ?? '');
  late final _r2PhoneController = TextEditingController(text: widget.state.reference2Phone ?? '');
  late final _r2RelationshipController =
      TextEditingController(text: widget.state.reference2Relationship ?? '');

  @override
  void dispose() {
    _r1NameController.dispose();
    _r1PhoneController.dispose();
    _r1RelationshipController.dispose();
    _r2NameController.dispose();
    _r2PhoneController.dispose();
    _r2RelationshipController.dispose();
    super.dispose();
  }

  String? _phoneValidator(String? value) {
    if (value == null || value.isEmpty) return null;
    if (!RegExp(r'^[6-9][0-9]{9}$').hasMatch(value)) return 'Enter a valid 10-digit phone number.';
    return null;
  }

  void _continue() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    widget.controller.updateReferences(
      reference1Name: _r1NameController.text.trim().isEmpty ? null : _r1NameController.text.trim(),
      reference1Phone:
          _r1PhoneController.text.trim().isEmpty ? null : _r1PhoneController.text.trim(),
      reference1Relationship: _r1RelationshipController.text.trim().isEmpty
          ? null
          : _r1RelationshipController.text.trim(),
      reference2Name: _r2NameController.text.trim().isEmpty ? null : _r2NameController.text.trim(),
      reference2Phone:
          _r2PhoneController.text.trim().isEmpty ? null : _r2PhoneController.text.trim(),
      reference2Relationship: _r2RelationshipController.text.trim().isEmpty
          ? null
          : _r2RelationshipController.text.trim(),
    );
    widget.controller.nextStep();
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return _StepBody(
      formKey: _formKey,
      children: [
        const _StepHeading(title: 'References'),
        Text('Reference 1', style: textTheme.titleSmall),
        const SizedBox(height: 8),
        TextFormField(
          controller: _r1NameController,
          decoration: const InputDecoration(labelText: 'Name'),
          validator: (value) =>
              (value == null || value.trim().isEmpty) ? 'Enter a name.' : null,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _r1PhoneController,
          keyboardType: TextInputType.phone,
          maxLength: 10,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(labelText: 'Phone', counterText: ''),
          validator: (value) {
            if (value == null || !RegExp(r'^[6-9][0-9]{9}$').hasMatch(value)) {
              return 'Enter a valid 10-digit phone number.';
            }
            return null;
          },
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _r1RelationshipController,
          decoration: const InputDecoration(labelText: 'Relationship'),
          validator: (value) =>
              (value == null || value.trim().isEmpty) ? 'Enter a relationship.' : null,
        ),
        const SizedBox(height: 24),
        Text('Reference 2 (optional)', style: textTheme.titleSmall),
        const SizedBox(height: 8),
        TextFormField(
          controller: _r2NameController,
          decoration: const InputDecoration(labelText: 'Name'),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _r2PhoneController,
          keyboardType: TextInputType.phone,
          maxLength: 10,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(labelText: 'Phone', counterText: ''),
          validator: _phoneValidator,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _r2RelationshipController,
          decoration: const InputDecoration(labelText: 'Relationship'),
        ),
        const SizedBox(height: 24),
        PrimaryButton(label: 'Continue', onPressed: _continue),
      ],
    );
  }
}

// --- Step 9: Documents ---

class _DocumentsStep extends ConsumerWidget {
  const _DocumentsStep({required this.controller, required this.categoryId});

  final LoanApplicationFlowController controller;
  final String? categoryId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overviewAsync = ref.watch(documentsOverviewProvider(categoryId));
    // A lender can't act on missing KYC/collateral proof — required
    // documents (the same ones the checklist above badges "Required")
    // must actually be uploaded before the applicant can proceed, not
    // just displayed as a suggestion. An OR-group requirement (e.g.
    // Salary Slip or ITR) only needs one member complete, not all.
    final allRequiredUploaded = overviewAsync.valueOrNull?.allRequiredSatisfied ?? false;

    return Column(
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: _StepHeading(
            title: 'Documents',
            subtitle: 'All required documents must be uploaded before you can continue.',
          ),
        ),
        Expanded(child: DocumentsChecklist(categoryId: categoryId)),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Column(
            children: [
              if (!allRequiredUploaded)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    'Upload all required documents to continue.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ),
              PrimaryButton(
                label: 'Continue',
                onPressed: allRequiredUploaded ? controller.nextStep : null,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// --- Step 10: Review ---

class _ReviewStep extends ConsumerWidget {
  const _ReviewStep({required this.category, required this.controller, required this.state});

  final LoanCategory? category;
  final LoanApplicationFlowController controller;
  final LoanApplicationFormState state;

  Future<void> _submit(BuildContext context, WidgetRef ref) async {
    final applicationId = await controller.submit();
    if (applicationId != null && context.mounted) {
      // `submit()` also PATCHes the customer profile (see
      // LoanApplicationFlowController.submit) and always adds a new
      // application — neither the Home dashboard nor Profile ever
      // re-fetch on their own otherwise (homeControllerProvider isn't
      // `.autoDispose` and nothing else invalidated it), so without
      // this, the just-submitted application/profile edits stayed
      // invisible on Home/Profile until a manual pull-to-refresh.
      ref.invalidate(homeControllerProvider);
      ref.invalidate(profileOverviewProvider);
      context.go('/loans/apply/success', extra: applicationId);
    }
  }

  /// Bank account numbers are shown masked here for the same reason
  /// Profile's read view masks them — this is a review screen someone
  /// might glance at over the user's shoulder, not a form field.
  String? _maskAccountNumber(String? value) {
    if (value == null || value.isEmpty) return null;
    if (value.length <= 4) return value;
    return '•••• •••• ${value.substring(value.length - 4)}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = Theme.of(context).textTheme;
    final steps = state.steps;
    final documentsOverview =
        ref.watch(documentsOverviewProvider(state.categoryId)).valueOrNull;
    // Phone lives on the User record (from Firebase sign-in), not the
    // CustomerProfile the rest of this wizard's state is built from —
    // shown here unconditionally (not gated by `steps`/category) so
    // every application, regardless of loan type, carries a contact
    // number for whoever reviews it.
    final phone = ref.watch(profileOverviewProvider).valueOrNull?.user.phone;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: ListView(
        children: [
          Text('Review your application', style: textTheme.headlineSmall),
          const SizedBox(height: 16),
          _ReviewSection(title: 'Contact', rows: [
            _ReviewRow(label: 'Mobile number', value: phone),
          ]),
          if (steps.contains(WizardStep.personal))
            _ReviewSection(title: 'Personal', rows: [
              _ReviewRow(label: 'Date of birth', value: state.dateOfBirth),
              _ReviewRow(label: 'Gender', value: state.gender),
              _ReviewRow(label: 'Marital status', value: state.maritalStatus),
              _ReviewRow(label: "Father's name", value: state.fatherName),
              _ReviewRow(label: "Mother's name", value: state.motherName),
            ]),
          if (steps.contains(WizardStep.address))
            _ReviewSection(title: 'Address', rows: [
              _ReviewRow(label: 'Current address',
                  value: [state.addressLine1, state.city, state.state, state.postalCode]
                      .whereType<String>()
                      .join(', ')),
              _ReviewRow(label: 'Residence type', value: state.residenceType),
              _ReviewRow(label: 'Permanent address', value: state.permanentAddress),
            ]),
          if (steps.contains(WizardStep.employment))
            _ReviewSection(title: 'Employment', rows: [
              _ReviewRow(label: 'Employment type', value: state.employmentStatus),
              _ReviewRow(label: 'Company', value: state.companyName),
              _ReviewRow(label: 'Designation', value: state.designation),
              _ReviewRow(label: 'Joining date', value: state.joiningDate),
              _ReviewRow(label: 'Office address', value: state.officeAddress),
              _ReviewRow(label: 'Office phone', value: state.officePhone),
            ]),
          if (steps.contains(WizardStep.income))
            _ReviewSection(title: 'Income', rows: [
              _ReviewRow(
                  label: 'Monthly salary',
                  value: state.monthlyIncome != null
                      ? Formatters.currency(state.monthlyIncome!.toStringAsFixed(2))
                      : null),
              _ReviewRow(
                  label: 'Additional income',
                  value: state.additionalIncome != null
                      ? Formatters.currency(state.additionalIncome!.toStringAsFixed(2))
                      : null),
              _ReviewRow(label: 'Bank account', value: _maskAccountNumber(state.bankAccountNumber)),
              _ReviewRow(label: 'IFSC code', value: state.bankIfscCode),
              _ReviewRow(label: 'Account holder', value: state.bankAccountHolderName),
            ]),
          if (steps.contains(WizardStep.existingLoans) &&
              (state.currentMonthlyEmi != null ||
                  state.existingLoansOutstanding != null ||
                  state.creditCardCount != null ||
                  state.creditCardOutstanding != null))
            _ReviewSection(title: 'Existing loans', rows: [
              _ReviewRow(
                  label: 'Current EMI',
                  value: state.currentMonthlyEmi != null
                      ? Formatters.currency(state.currentMonthlyEmi!.toStringAsFixed(2))
                      : null),
              _ReviewRow(
                  label: 'Outstanding amount',
                  value: state.existingLoansOutstanding != null
                      ? Formatters.currency(state.existingLoansOutstanding!.toStringAsFixed(2))
                      : null),
              _ReviewRow(
                  label: 'Credit cards', value: state.creditCardCount?.toString()),
              _ReviewRow(
                  label: 'Card outstanding',
                  value: state.creditCardOutstanding != null
                      ? Formatters.currency(state.creditCardOutstanding!.toStringAsFixed(2))
                      : null),
            ]),
          if (steps.contains(WizardStep.propertyDetails))
            _ReviewSection(title: 'Property details', rows: [
              _ReviewRow(label: 'Property type', value: state.propertyType),
              _ReviewRow(label: 'Ownership', value: state.propertyOwnership),
              _ReviewRow(label: 'Address', value: state.propertyAddress),
              _ReviewRow(
                  label: 'Value',
                  value: state.propertyValue != null
                      ? Formatters.currency(state.propertyValue!.toStringAsFixed(2))
                      : null),
              _ReviewRow(
                  label: 'Existing loan on property',
                  value: state.hasExistingLoanOnProperty == true ? 'Yes' : 'No'),
              if (state.hasExistingLoanOnProperty == true)
                _ReviewRow(
                    label: 'Outstanding amount',
                    value: state.existingLoanOutstandingAmount != null
                        ? Formatters.currency(
                            state.existingLoanOutstandingAmount!.toStringAsFixed(2))
                        : null),
            ]),
          _ReviewSection(title: 'Loan requirement', rows: [
            _ReviewRow(label: 'Loan type', value: category?.title ?? 'General'),
            _ReviewRow(
                label: 'Amount',
                value: state.amount != null
                    ? Formatters.currency(state.amount!.toStringAsFixed(2))
                    : null),
            _ReviewRow(
                label: 'Term', value: state.termMonths != null ? '${state.termMonths} months' : null),
            if (state.purpose != null && state.purpose!.isNotEmpty)
              _ReviewRow(label: 'Purpose', value: state.purpose),
          ]),
          if (steps.contains(WizardStep.nominee))
            _ReviewSection(title: 'Nominee', rows: [
              _ReviewRow(label: 'Name', value: state.nomineeName),
              _ReviewRow(label: 'Relationship', value: state.nomineeRelationship),
              _ReviewRow(label: 'Phone', value: state.nomineePhone),
            ]),
          if (steps.contains(WizardStep.references))
            _ReviewSection(title: 'References', rows: [
              _ReviewRow(label: 'Reference 1 name', value: state.reference1Name),
              _ReviewRow(label: 'Reference 1 phone', value: state.reference1Phone),
              _ReviewRow(
                  label: 'Reference 1 relationship', value: state.reference1Relationship),
              _ReviewRow(label: 'Reference 2 name', value: state.reference2Name),
              _ReviewRow(label: 'Reference 2 phone', value: state.reference2Phone),
              _ReviewRow(
                  label: 'Reference 2 relationship', value: state.reference2Relationship),
            ]),
          if (steps.contains(WizardStep.documents) && documentsOverview != null)
            _ReviewSection(title: 'Documents', rows: [
              _ReviewRow(
                label: 'Uploaded',
                value: () {
                  final summary = documentsOverview.requiredSummary;
                  return '${summary.satisfied} of ${summary.total} required documents';
                }(),
              ),
            ]),
          if (state.amount != null && state.termMonths != null)
            LoanCostBreakdownCard(
              title: 'Estimated cost',
              breakdown: computeLoanCostBreakdown(
                principal: state.amount!,
                annualRatePercent: category?.indicativeRateMidpoint ?? 16,
                tenureMonths: state.termMonths!,
                processingFeePercent: category?.processingFeePercent ?? 0.02,
              ),
              tenureMonths: state.termMonths!,
              rateLabel: category != null
                  ? '${category!.indicativeRateMin}–${category!.indicativeRateMax}% p.a.'
                  : '~${category?.indicativeRateMidpoint ?? 16}% p.a.',
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
            onPressed: () => _submit(context, ref),
          ),
        ],
      ),
    );
  }
}

class _ReviewSection extends StatelessWidget {
  const _ReviewSection({required this.title, required this.rows});

  final String title;
  final List<_ReviewRow> rows;

  @override
  Widget build(BuildContext context) {
    final visible = rows.where((r) => r.value != null && r.value!.isNotEmpty).toList();
    if (visible.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [for (final row in visible) row],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.label, required this.value});

  final String label;
  final String? value;

  @override
  Widget build(BuildContext context) {
    if (value == null || value!.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 120, child: Text(label, style: Theme.of(context).textTheme.bodySmall)),
          Expanded(child: Text(value!, style: Theme.of(context).textTheme.bodyLarge)),
        ],
      ),
    );
  }
}
