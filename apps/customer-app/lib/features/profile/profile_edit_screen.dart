import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/indian_states.dart';
import '../../core/constants/profile_options.dart';
import '../../core/riverpod/providers.dart';
import '../../core/utils/friendly_error.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/labeled_section.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/skeleton_loader.dart';
import '../../core/widgets/state_views.dart';
import 'profile_providers.dart';

/// Edit form over every self-reportable `CustomerProfile` field.
///
/// Phase 5 scope note (kept for history): this was originally a
/// single combined view+edit screen; Phase 6 splits it into
/// ProfileViewScreen (read-only) + this edit form, per the explicit
/// "View profile" / "Edit profile" requirement.
///
/// India-localization pass: State and Employment status are now
/// dropdowns (not free text), PIN code is validated as a 6-digit
/// Indian postal code, and Country is fixed to India (this app serves
/// Indian customers only). Production pass: adds Bank Account (for
/// disbursement) and Nominee sections.
class ProfileEditScreen extends ConsumerStatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  ConsumerState<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends ConsumerState<ProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _postalCodeController = TextEditingController();
  final _monthlyIncomeController = TextEditingController();
  final _panController = TextEditingController();
  final _aadhaarController = TextEditingController();
  final _bankAccountController = TextEditingController();
  final _bankIfscController = TextEditingController();
  final _bankAccountHolderController = TextEditingController();
  final _nomineeNameController = TextEditingController();
  final _nomineePhoneController = TextEditingController();
  final _fatherNameController = TextEditingController();
  final _motherNameController = TextEditingController();
  final _companyNameController = TextEditingController();
  final _designationController = TextEditingController();
  final _currentEmiController = TextEditingController();
  final _creditCardCountController = TextEditingController();
  final _creditCardOutstandingController = TextEditingController();
  final _existingLoansOutstandingController = TextEditingController();
  final _reference1NameController = TextEditingController();
  final _reference1PhoneController = TextEditingController();
  final _reference1RelationshipController = TextEditingController();
  final _reference2NameController = TextEditingController();
  final _reference2PhoneController = TextEditingController();
  final _reference2RelationshipController = TextEditingController();

  String? _state;
  String? _employmentStatus;
  String? _nomineeRelationship;
  String? _gender;
  String? _maritalStatus;
  String? _dateOfBirth;

  bool _isSaving = false;
  bool _initialized = false;

  @override
  void dispose() {
    _addressController.dispose();
    _cityController.dispose();
    _postalCodeController.dispose();
    _monthlyIncomeController.dispose();
    _panController.dispose();
    _aadhaarController.dispose();
    _bankAccountController.dispose();
    _bankIfscController.dispose();
    _bankAccountHolderController.dispose();
    _nomineeNameController.dispose();
    _nomineePhoneController.dispose();
    _fatherNameController.dispose();
    _motherNameController.dispose();
    _companyNameController.dispose();
    _designationController.dispose();
    _currentEmiController.dispose();
    _creditCardCountController.dispose();
    _creditCardOutstandingController.dispose();
    _existingLoansOutstandingController.dispose();
    _reference1NameController.dispose();
    _reference1PhoneController.dispose();
    _reference1RelationshipController.dispose();
    _reference2NameController.dispose();
    _reference2PhoneController.dispose();
    _reference2RelationshipController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    setState(() => _isSaving = true);

    final income = double.tryParse(_monthlyIncomeController.text);

    final result =
        await ref.read(customerProfileRepositoryProvider).updateMyProfile({
      if (_addressController.text.isNotEmpty)
        'addressLine1': _addressController.text,
      if (_cityController.text.isNotEmpty) 'city': _cityController.text,
      if (_state != null) 'state': _state,
      if (_postalCodeController.text.isNotEmpty)
        'postalCode': _postalCodeController.text,
      'country': 'India',
      if (_employmentStatus != null) 'employmentStatus': _employmentStatus,
      if (income != null) 'monthlyIncome': income,
      if (_panController.text.isNotEmpty)
        'panNumber': _panController.text.trim().toUpperCase(),
      if (_aadhaarController.text.isNotEmpty)
        'aadhaarNumber': _aadhaarController.text.trim(),
      if (_bankAccountController.text.isNotEmpty)
        'bankAccountNumber': _bankAccountController.text.trim(),
      if (_bankIfscController.text.isNotEmpty)
        'bankIfscCode': _bankIfscController.text.trim().toUpperCase(),
      if (_bankAccountHolderController.text.isNotEmpty)
        'bankAccountHolderName': _bankAccountHolderController.text.trim(),
      if (_nomineeNameController.text.isNotEmpty)
        'nomineeName': _nomineeNameController.text.trim(),
      if (_nomineeRelationship != null)
        'nomineeRelationship': _nomineeRelationship,
      if (_nomineePhoneController.text.isNotEmpty)
        'nomineePhone': _nomineePhoneController.text.trim(),
      if (_dateOfBirth != null) 'dateOfBirth': _dateOfBirth,
      if (_gender != null) 'gender': _gender,
      if (_maritalStatus != null) 'maritalStatus': _maritalStatus,
      if (_fatherNameController.text.isNotEmpty)
        'fatherName': _fatherNameController.text.trim(),
      if (_motherNameController.text.isNotEmpty)
        'motherName': _motherNameController.text.trim(),
      if (_companyNameController.text.isNotEmpty)
        'companyName': _companyNameController.text.trim(),
      if (_designationController.text.isNotEmpty)
        'designation': _designationController.text.trim(),
      if (double.tryParse(_currentEmiController.text) != null)
        'currentMonthlyEmi': double.parse(_currentEmiController.text),
      if (int.tryParse(_creditCardCountController.text) != null)
        'creditCardCount': int.parse(_creditCardCountController.text),
      if (double.tryParse(_creditCardOutstandingController.text) != null)
        'creditCardOutstanding': double.parse(_creditCardOutstandingController.text),
      if (double.tryParse(_existingLoansOutstandingController.text) != null)
        'existingLoansOutstanding': double.parse(_existingLoansOutstandingController.text),
      if (_reference1NameController.text.isNotEmpty)
        'reference1Name': _reference1NameController.text.trim(),
      if (_reference1PhoneController.text.isNotEmpty)
        'reference1Phone': _reference1PhoneController.text.trim(),
      if (_reference1RelationshipController.text.isNotEmpty)
        'reference1Relationship': _reference1RelationshipController.text.trim(),
      if (_reference2NameController.text.isNotEmpty)
        'reference2Name': _reference2NameController.text.trim(),
      if (_reference2PhoneController.text.isNotEmpty)
        'reference2Phone': _reference2PhoneController.text.trim(),
      if (_reference2RelationshipController.text.isNotEmpty)
        'reference2Relationship': _reference2RelationshipController.text.trim(),
    });

    if (!mounted) return;
    setState(() => _isSaving = false);

    result.when(
      success: (_) {
        ref.invalidate(profileOverviewProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile saved.')),
        );
      },
      failure: (error) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not save profile: ${friendlyMessage(error)}')),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final overviewAsync = ref.watch(profileOverviewProvider);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Edit profile')),
      body: overviewAsync.when(
        loading: () => ListView(
          padding: const EdgeInsets.all(16),
          children: const [
            SkeletonCard(lines: 3),
            SizedBox(height: 16),
            SkeletonCard(lines: 3),
            SizedBox(height: 16),
            SkeletonCard(lines: 2),
          ],
        ),
        error: (error, _) => ErrorView(message: friendlyMessage(error)),
        data: (overview) {
          final profile = overview.customerProfile;
          if (!_initialized) {
            _addressController.text = profile?.addressLine1 ?? '';
            _cityController.text = profile?.city ?? '';
            _postalCodeController.text = profile?.postalCode ?? '';
            _monthlyIncomeController.text = profile?.monthlyIncome ?? '';
            _panController.text = profile?.panNumber ?? '';
            _bankIfscController.text = profile?.bankIfscCode ?? '';
            _bankAccountHolderController.text =
                profile?.bankAccountHolderName ?? '';
            _nomineeNameController.text = profile?.nomineeName ?? '';
            _nomineePhoneController.text = profile?.nomineePhone ?? '';
            _fatherNameController.text = profile?.fatherName ?? '';
            _motherNameController.text = profile?.motherName ?? '';
            _companyNameController.text = profile?.companyName ?? '';
            _designationController.text = profile?.designation ?? '';
            _currentEmiController.text = profile?.currentMonthlyEmi ?? '';
            _creditCardCountController.text = profile?.creditCardCount?.toString() ?? '';
            _creditCardOutstandingController.text = profile?.creditCardOutstanding ?? '';
            _existingLoansOutstandingController.text = profile?.existingLoansOutstanding ?? '';
            _reference1NameController.text = profile?.reference1Name ?? '';
            _reference1PhoneController.text = profile?.reference1Phone ?? '';
            _reference1RelationshipController.text = profile?.reference1Relationship ?? '';
            _reference2NameController.text = profile?.reference2Name ?? '';
            _reference2PhoneController.text = profile?.reference2Phone ?? '';
            _reference2RelationshipController.text = profile?.reference2Relationship ?? '';
            // Aadhaar and the full bank account number are never
            // returned by the backend (only masked, for display) — the
            // fields always start empty; leaving them empty on save
            // keeps the existing stored value.
            _state = kIndianStatesAndUnionTerritories
                    .contains(profile?.state)
                ? profile?.state
                : null;
            _employmentStatus =
                kEmploymentStatusOptions.contains(profile?.employmentStatus)
                    ? profile?.employmentStatus
                    : null;
            _nomineeRelationship = kNomineeRelationshipOptions
                    .contains(profile?.nomineeRelationship)
                ? profile?.nomineeRelationship
                : null;
            _gender = kGenderOptions.contains(profile?.gender) ? profile?.gender : null;
            _maritalStatus = kMaritalStatusOptions.contains(profile?.maritalStatus)
                ? profile?.maritalStatus
                : null;
            _dateOfBirth = profile?.dateOfBirth;
            _initialized = true;
          }

          return Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const LabeledSection(icon: Icons.person_outline, label: 'Personal'),
                      const SizedBox(height: 12),
                      InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () async {
                          final now = DateTime.now();
                          final initial =
                              _dateOfBirth != null ? DateTime.tryParse(_dateOfBirth!) : null;
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: initial ?? DateTime(now.year - 25),
                            firstDate: DateTime(now.year - 100),
                            lastDate: DateTime(now.year - 18, now.month, now.day),
                          );
                          if (picked != null) {
                            setState(() => _dateOfBirth = picked.toIso8601String().split('T').first);
                          }
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(labelText: 'Date of birth'),
                          child: Text(_dateOfBirth ?? 'Select date', style: textTheme.bodyLarge),
                        ),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: _gender,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Gender'),
                        items: [
                          for (final g in kGenderOptions) DropdownMenuItem(value: g, child: Text(g)),
                        ],
                        onChanged: (value) => setState(() => _gender = value),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: _maritalStatus,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Marital status'),
                        items: [
                          for (final m in kMaritalStatusOptions)
                            DropdownMenuItem(value: m, child: Text(m)),
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
                        decoration: const InputDecoration(labelText: "Mother's name"),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const LabeledSection(
                          icon: Icons.verified_user_outlined, label: 'KYC details'),
                      const SizedBox(height: 4),
                      Text(
                        'Required before you can apply for a loan.',
                        style: textTheme.bodySmall,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _panController,
                        textCapitalization: TextCapitalization.characters,
                        maxLength: 10,
                        decoration: const InputDecoration(
                          labelText: 'PAN number',
                          hintText: 'ABCDE1234F',
                          counterText: '',
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) return null;
                          if (!RegExp(r'^[A-Za-z]{5}[0-9]{4}[A-Za-z]$').hasMatch(value)) {
                            return 'Enter a valid PAN (e.g. ABCDE1234F).';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _aadhaarController,
                        keyboardType: TextInputType.number,
                        maxLength: 12,
                        decoration: InputDecoration(
                          labelText: 'Aadhaar number',
                          hintText: profile?.aadhaarLast4 != null
                              ? 'On file: •••• •••• ${profile!.aadhaarLast4}'
                              : '123456789012',
                          counterText: '',
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) return null;
                          if (!RegExp(r'^[0-9]{12}$').hasMatch(value)) {
                            return 'Enter a valid 12-digit Aadhaar number.';
                          }
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const LabeledSection(icon: Icons.home_outlined, label: 'Address'),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _addressController,
                        decoration: const InputDecoration(labelText: 'Address'),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _cityController,
                        decoration: const InputDecoration(labelText: 'City'),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: _state,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'State'),
                        items: [
                          for (final state in kIndianStatesAndUnionTerritories)
                            DropdownMenuItem(value: state, child: Text(state)),
                        ],
                        onChanged: (value) => setState(() => _state = value),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _postalCodeController,
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        decoration: const InputDecoration(
                          labelText: 'PIN code',
                          counterText: '',
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) return null;
                          if (!RegExp(r'^[1-9][0-9]{5}$').hasMatch(value)) {
                            return 'Enter a valid 6-digit PIN code.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        initialValue: 'India',
                        readOnly: true,
                        decoration: const InputDecoration(labelText: 'Country'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const LabeledSection(
                          icon: Icons.work_outline, label: 'Employment & income'),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: _employmentStatus,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Employment status'),
                        items: [
                          for (final status in kEmploymentStatusOptions)
                            DropdownMenuItem(value: status, child: Text(status)),
                        ],
                        onChanged: (value) =>
                            setState(() => _employmentStatus = value),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _companyNameController,
                        decoration: const InputDecoration(labelText: 'Company name (optional)'),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _designationController,
                        decoration: const InputDecoration(labelText: 'Designation (optional)'),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _monthlyIncomeController,
                        keyboardType:
                            const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Monthly income (₹)',
                          prefixText: '₹ ',
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const LabeledSection(
                          icon: Icons.account_balance_wallet_outlined,
                          label: 'Existing obligations'),
                      const SizedBox(height: 4),
                      Text('Leave blank if none.', style: textTheme.bodySmall),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _currentEmiController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                            labelText: 'Current monthly EMI', prefixText: '₹ '),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _creditCardCountController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Number of credit cards'),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _creditCardOutstandingController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                            labelText: 'Credit card outstanding', prefixText: '₹ '),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _existingLoansOutstandingController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                            labelText: 'Other outstanding loans', prefixText: '₹ '),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const LabeledSection(
                          icon: Icons.account_balance_outlined, label: 'Bank account'),
                      const SizedBox(height: 4),
                      Text(
                        'Where your loan is disbursed, once approved.',
                        style: textTheme.bodySmall,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _bankAccountController,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Account number',
                          hintText: profile?.bankAccountLast4 != null
                              ? 'On file: •••• •••• ${profile!.bankAccountLast4}'
                              : null,
                        ),
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
                          labelText: 'IFSC code',
                          hintText: 'HDFC0001234',
                          counterText: '',
                        ),
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
                        controller: _bankAccountHolderController,
                        decoration: const InputDecoration(labelText: 'Account holder name'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const LabeledSection(
                          icon: Icons.contact_emergency_outlined, label: 'Nominee'),
                      const SizedBox(height: 4),
                      Text(
                        'Who we contact for your loan in an emergency.',
                        style: textTheme.bodySmall,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _nomineeNameController,
                        decoration: const InputDecoration(labelText: 'Nominee name'),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: _nomineeRelationship,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Relationship'),
                        items: [
                          for (final relationship in kNomineeRelationshipOptions)
                            DropdownMenuItem(value: relationship, child: Text(relationship)),
                        ],
                        onChanged: (value) =>
                            setState(() => _nomineeRelationship = value),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _nomineePhoneController,
                        keyboardType: TextInputType.phone,
                        maxLength: 10,
                        decoration: const InputDecoration(
                            labelText: 'Nominee phone (optional)', counterText: ''),
                        validator: (value) {
                          if (value == null || value.isEmpty) return null;
                          if (!RegExp(r'^[6-9][0-9]{9}$').hasMatch(value)) {
                            return 'Enter a valid 10-digit phone number.';
                          }
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const LabeledSection(icon: Icons.contacts_outlined, label: 'References'),
                      const SizedBox(height: 4),
                      Text('Reference 1', style: textTheme.titleSmall),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _reference1NameController,
                        decoration: const InputDecoration(labelText: 'Name'),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _reference1PhoneController,
                        keyboardType: TextInputType.phone,
                        maxLength: 10,
                        decoration: const InputDecoration(labelText: 'Phone', counterText: ''),
                        validator: (value) {
                          if (value == null || value.isEmpty) return null;
                          if (!RegExp(r'^[6-9][0-9]{9}$').hasMatch(value)) {
                            return 'Enter a valid 10-digit phone number.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _reference1RelationshipController,
                        decoration: const InputDecoration(labelText: 'Relationship'),
                      ),
                      const SizedBox(height: 20),
                      Text('Reference 2 (optional)', style: textTheme.titleSmall),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _reference2NameController,
                        decoration: const InputDecoration(labelText: 'Name'),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _reference2PhoneController,
                        keyboardType: TextInputType.phone,
                        maxLength: 10,
                        decoration: const InputDecoration(labelText: 'Phone', counterText: ''),
                        validator: (value) {
                          if (value == null || value.isEmpty) return null;
                          if (!RegExp(r'^[6-9][0-9]{9}$').hasMatch(value)) {
                            return 'Enter a valid 10-digit phone number.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _reference2RelationshipController,
                        decoration: const InputDecoration(labelText: 'Relationship'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                PrimaryButton(
                    label: 'Save', isLoading: _isSaving, onPressed: _save),
              ],
            ),
          );
        },
      ),
    );
  }
}
