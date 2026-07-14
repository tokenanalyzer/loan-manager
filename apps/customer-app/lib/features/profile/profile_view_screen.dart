import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/auth/customer_auth_repository.dart';
import '../../core/config/env_config.dart';
import '../../core/di/injection.dart';
import '../../core/utils/friendly_error.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/state_views.dart';
import 'profile_providers.dart';

/// Read-only profile summary + navigation to Edit/Privacy Settings.
///
/// Production pass: a full summary (photo, contact details, address,
/// occupation, income, KYC, bank account, nominee) instead of the
/// earlier bare name/address/employment card — this is meant to read
/// as a real account page, not a placeholder.
class ProfileViewScreen extends ConsumerWidget {
  const ProfileViewScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overviewAsync = ref.watch(profileOverviewProvider);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Edit profile',
            onPressed: () => context.push('/profile/edit'),
          ),
        ],
      ),
      body: overviewAsync.when(
        loading: () => const LoadingView(),
        error: (error, _) => ErrorView(
          message: friendlyMessage(error),
          onRetry: () => ref.invalidate(profileOverviewProvider),
        ),
        data: (overview) {
          final user = overview.user;
          final profile = overview.customerProfile;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Identity — avatar (initials, not a fake stock photo) +
              // name + contact details.
              AppCard(
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor:
                          Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
                      child: Text(
                        _initialsFor(user.fullName),
                        style: textTheme.titleLarge
                            ?.copyWith(color: Theme.of(context).colorScheme.primary),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(user.fullName ?? 'Add your name',
                              style: textTheme.titleLarge),
                          if (user.phone != null)
                            Text(user.phone!, style: textTheme.bodyMedium),
                          Text(user.email ?? 'No email on file',
                              style: textTheme.bodySmall),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              AppCard(
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('KYC status', style: textTheme.labelSmall),
                          const SizedBox(height: 4),
                          StatusBadge.forKycStatus(
                              profile?.kycStatus ?? 'not_submitted'),
                          if (profile?.kycStatus == 'rejected' &&
                              profile?.kycRejectionReason != null) ...[
                            const SizedBox(height: 6),
                            Text(profile!.kycRejectionReason!,
                                style: textTheme.bodySmall),
                          ],
                        ],
                      ),
                    ),
                    if (profile?.panNumber == null ||
                        profile?.aadhaarLast4 == null)
                      TextButton(
                        onPressed: () => context.push('/profile/edit'),
                        child: const Text('Complete KYC'),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _FieldRow(
                      label: 'PAN',
                      value: profile?.panNumber ?? 'Not provided yet',
                    ),
                    _FieldRow(
                      label: 'Aadhaar',
                      value: profile?.aadhaarLast4 != null
                          ? '•••• •••• ${profile!.aadhaarLast4}'
                          : 'Not provided yet',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Address', style: textTheme.labelSmall),
                    Text(
                      profile?.addressLine1 != null
                          ? '${profile!.addressLine1}, ${profile.city ?? ''}${profile.state != null ? ', ${profile.state}' : ''}${profile.postalCode != null ? ' - ${profile.postalCode}' : ''}'
                          : 'Not provided yet',
                      style: textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 12),
                    _FieldRow(
                      label: 'Occupation',
                      value: profile?.employmentStatus ?? 'Not provided yet',
                    ),
                    _FieldRow(
                      label: 'Monthly income',
                      value: profile?.monthlyIncome != null
                          ? Formatters.currency(profile!.monthlyIncome!)
                          : 'Not provided yet',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Bank account', style: textTheme.labelSmall),
                    const SizedBox(height: 4),
                    Text(
                      profile?.bankAccountLast4 != null
                          ? '•••• •••• ${profile!.bankAccountLast4}'
                          : 'Not provided yet',
                      style: textTheme.bodyMedium,
                    ),
                    if (profile?.bankIfscCode != null)
                      Text(profile!.bankIfscCode!, style: textTheme.bodySmall),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Nominee', style: textTheme.labelSmall),
                    const SizedBox(height: 4),
                    Text(
                      profile?.nomineeName ?? 'Not provided yet',
                      style: textTheme.bodyMedium,
                    ),
                    if (profile?.nomineeRelationship != null)
                      Text(profile!.nomineeRelationship!, style: textTheme.bodySmall),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              AppCard(
                onTap: () => context.push('/profile/privacy'),
                child: const ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.privacy_tip_outlined),
                  title: Text('Privacy settings'),
                  trailing: Icon(Icons.chevron_right),
                ),
              ),
              if (EnvConfig.firebaseEnabled) ...[
                const SizedBox(height: 16),
                AppCard(
                  onTap: () => getIt<CustomerAuthRepository>().signOut(),
                  child: const ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.logout, color: Colors.red),
                    title: Text('Sign out', style: TextStyle(color: Colors.red)),
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  static String _initialsFor(String? fullName) {
    if (fullName == null || fullName.trim().isEmpty) return '?';
    final parts = fullName.trim().split(RegExp(r'\s+'));
    final first = parts.first.isNotEmpty ? parts.first[0] : '';
    final last = parts.length > 1 && parts.last.isNotEmpty ? parts.last[0] : '';
    return (first + last).toUpperCase();
  }
}

class _FieldRow extends StatelessWidget {
  const _FieldRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          Text(value,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
