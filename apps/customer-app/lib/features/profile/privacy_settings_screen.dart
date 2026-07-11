import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/riverpod/providers.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/state_views.dart';
import 'profile_providers.dart';

/// Consent records + privacy toggles, and the entry point to
/// account-deletion requests.
class PrivacySettingsScreen extends ConsumerStatefulWidget {
  const PrivacySettingsScreen({super.key});

  @override
  ConsumerState<PrivacySettingsScreen> createState() => _PrivacySettingsScreenState();
}

class _PrivacySettingsScreenState extends ConsumerState<PrivacySettingsScreen> {
  bool _isSaving = false;

  Future<void> _setMarketingConsent(bool value) async {
    setState(() => _isSaving = true);
    final result = await ref
        .read(customerProfileRepositoryProvider)
        .updateMyProfile({'marketingConsent': value});
    if (!mounted) return;
    result.when(
      success: (_) => ref.invalidate(profileOverviewProvider),
      failure: (_) {},
    );
    setState(() => _isSaving = false);
  }

  Future<void> _acceptDataConsent() async {
    setState(() => _isSaving = true);
    final result = await ref
        .read(customerProfileRepositoryProvider)
        .updateMyProfile({'acceptDataConsent': true});
    if (!mounted) return;
    result.when(
      success: (_) => ref.invalidate(profileOverviewProvider),
      failure: (_) {},
    );
    setState(() => _isSaving = false);
  }

  @override
  Widget build(BuildContext context) {
    final overviewAsync = ref.watch(profileOverviewProvider);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Privacy settings')),
      body: overviewAsync.when(
        loading: () => const LoadingView(),
        error: (error, _) => ErrorView(message: 'Could not load privacy settings: $error'),
        data: (overview) {
          final profile = overview.customerProfile;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              AppCard(
                child: SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Marketing communications'),
                  subtitle: const Text('Receive occasional product updates and offers.'),
                  value: profile?.marketingConsent ?? false,
                  onChanged: _isSaving ? null : _setMarketingConsent,
                ),
              ),
              const SizedBox(height: 12),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Data processing consent', style: textTheme.titleSmall),
                    const SizedBox(height: 4),
                    Text(
                      profile?.dataConsentAcceptedAt != null
                          ? 'Accepted on ${Formatters.date(profile!.dataConsentAcceptedAt!)}.'
                          : 'Not yet accepted.',
                      style: textTheme.bodySmall,
                    ),
                    if (profile?.dataConsentAcceptedAt == null) ...[
                      const SizedBox(height: 12),
                      OutlinedButton(
                        onPressed: _isSaving ? null : _acceptDataConsent,
                        child: const Text('Accept data processing policy'),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Text('Danger zone', style: textTheme.titleSmall?.copyWith(color: Colors.red)),
              const SizedBox(height: 8),
              AppCard(
                onTap: () => context.push('/profile/delete-account'),
                child: const ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.delete_outline, color: Colors.red),
                  title: Text('Request account deletion', style: TextStyle(color: Colors.red)),
                  trailing: Icon(Icons.chevron_right),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
