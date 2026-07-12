import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/riverpod/providers.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/state_views.dart';
import 'profile_providers.dart';

/// Edit form over every self-reportable `CustomerProfile` field.
///
/// Phase 5 scope note (kept for history): this was originally a
/// single combined view+edit screen; Phase 6 splits it into
/// ProfileViewScreen (read-only) + this edit form, per the explicit
/// "View profile" / "Edit profile" requirement.
class ProfileEditScreen extends ConsumerStatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  ConsumerState<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends ConsumerState<ProfileEditScreen> {
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _postalCodeController = TextEditingController();
  final _countryController = TextEditingController();
  final _employmentStatusController = TextEditingController();
  final _monthlyIncomeController = TextEditingController();

  bool _isSaving = false;
  bool _initialized = false;
  String? _message;

  @override
  void dispose() {
    _addressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _postalCodeController.dispose();
    _countryController.dispose();
    _employmentStatusController.dispose();
    _monthlyIncomeController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _isSaving = true;
      _message = null;
    });

    final income = double.tryParse(_monthlyIncomeController.text);

    final result =
        await ref.read(customerProfileRepositoryProvider).updateMyProfile({
      if (_addressController.text.isNotEmpty)
        'addressLine1': _addressController.text,
      if (_cityController.text.isNotEmpty) 'city': _cityController.text,
      if (_stateController.text.isNotEmpty) 'state': _stateController.text,
      if (_postalCodeController.text.isNotEmpty)
        'postalCode': _postalCodeController.text,
      if (_countryController.text.isNotEmpty)
        'country': _countryController.text,
      if (_employmentStatusController.text.isNotEmpty)
        'employmentStatus': _employmentStatusController.text,
      if (income != null) 'monthlyIncome': income,
    });

    if (!mounted) return;

    result.when(
      success: (_) {
        ref.invalidate(profileOverviewProvider);
        setState(() {
          _isSaving = false;
          _message = 'Profile saved.';
        });
      },
      failure: (error) => setState(() {
        _isSaving = false;
        _message = 'Could not save profile: ${error.message}';
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final overviewAsync = ref.watch(profileOverviewProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Edit profile')),
      body: overviewAsync.when(
        loading: () => const LoadingView(),
        error: (error, _) =>
            ErrorView(message: 'Could not load your profile: $error'),
        data: (overview) {
          if (!_initialized) {
            final profile = overview.customerProfile;
            _addressController.text = profile?.addressLine1 ?? '';
            _cityController.text = profile?.city ?? '';
            _stateController.text = profile?.state ?? '';
            _postalCodeController.text = profile?.postalCode ?? '';
            _countryController.text = profile?.country ?? '';
            _employmentStatusController.text = profile?.employmentStatus ?? '';
            _monthlyIncomeController.text = profile?.monthlyIncome ?? '';
            _initialized = true;
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextField(
                controller: _addressController,
                decoration: const InputDecoration(
                    labelText: 'Address', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _cityController,
                decoration: const InputDecoration(
                    labelText: 'City', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _stateController,
                decoration: const InputDecoration(
                    labelText: 'State/Province', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _postalCodeController,
                decoration: const InputDecoration(
                    labelText: 'Postal code', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _countryController,
                decoration: const InputDecoration(
                    labelText: 'Country', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _employmentStatusController,
                decoration: const InputDecoration(
                  labelText: 'Employment status',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _monthlyIncomeController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Monthly income',
                  prefixText: '\$ ',
                  border: OutlineInputBorder(),
                ),
              ),
              if (_message != null) ...[
                const SizedBox(height: 12),
                Text(_message!, style: Theme.of(context).textTheme.bodyMedium),
              ],
              const SizedBox(height: 24),
              PrimaryButton(
                  label: 'Save', isLoading: _isSaving, onPressed: _save),
            ],
          );
        },
      ),
    );
  }
}
