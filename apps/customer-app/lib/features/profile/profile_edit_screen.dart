import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/indian_states.dart';
import '../../core/riverpod/providers.dart';
import '../../core/utils/friendly_error.dart';
import '../../core/widgets/primary_button.dart';
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

  String? _state;
  String? _employmentStatus;
  String? _nomineeRelationship;

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
        loading: () => const LoadingView(),
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
            _initialized = true;
          }

          return Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('KYC details', style: textTheme.titleMedium),
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
                const SizedBox(height: 24),
                Text('Address', style: textTheme.titleMedium),
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
                const SizedBox(height: 24),
                Text('Employment & income', style: textTheme.titleMedium),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _employmentStatus,
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
                  controller: _monthlyIncomeController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Monthly income (₹)',
                    prefixText: '₹ ',
                  ),
                ),
                const SizedBox(height: 24),
                Text('Bank account', style: textTheme.titleMedium),
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
                const SizedBox(height: 24),
                Text('Nominee', style: textTheme.titleMedium),
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
                  decoration: const InputDecoration(labelText: 'Relationship'),
                  items: [
                    for (final relationship in kNomineeRelationshipOptions)
                      DropdownMenuItem(value: relationship, child: Text(relationship)),
                  ],
                  onChanged: (value) =>
                      setState(() => _nomineeRelationship = value),
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
