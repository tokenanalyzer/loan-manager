import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/auth/customer_auth_repository.dart';
import '../../core/config/env_config.dart';
import '../../core/di/injection.dart';
import '../../core/utils/friendly_error.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/fade_slide_in.dart';
import '../../core/widgets/labeled_section.dart';
import '../../core/widgets/skeleton_loader.dart';
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
    final colorScheme = Theme.of(context).colorScheme;

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
        loading: () => ListView(
          padding: const EdgeInsets.all(16),
          children: const [
            SkeletonCard(lines: 2),
            SizedBox(height: 16),
            SkeletonCard(lines: 2),
            SizedBox(height: 16),
            SkeletonCard(lines: 3),
          ],
        ),
        error: (error, _) => ErrorView(
          message: friendlyMessage(error),
          onRetry: () => ref.invalidate(profileOverviewProvider),
        ),
        data: (overview) {
          final user = overview.user;
          final profile = overview.customerProfile;
          final sections = <Widget>[
            // Identity — avatar (initials, not a fake stock photo) +
            // name + contact details.
            AppCard(
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: colorScheme.primary.withValues(alpha: 0.12),
                    child: Text(
                      _initialsFor(user.fullName),
                      style: textTheme.titleLarge?.copyWith(color: colorScheme.primary),
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
            AppCard(
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const LabeledSection(icon: Icons.verified_user_outlined, label: 'KYC status'),
                        const SizedBox(height: 6),
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
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const LabeledSection(icon: Icons.badge_outlined, label: 'Identity documents'),
                  const SizedBox(height: 10),
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
            if (profile?.gender != null ||
                profile?.maritalStatus != null ||
                profile?.fatherName != null)
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const LabeledSection(icon: Icons.person_outline, label: 'Personal'),
                    const SizedBox(height: 10),
                    if (profile?.dateOfBirth != null)
                      _FieldRow(label: 'Date of birth', value: profile!.dateOfBirth!),
                    if (profile?.gender != null)
                      _FieldRow(label: 'Gender', value: profile!.gender!),
                    if (profile?.maritalStatus != null)
                      _FieldRow(label: 'Marital status', value: profile!.maritalStatus!),
                    if (profile?.fatherName != null)
                      _FieldRow(label: "Father's name", value: profile!.fatherName!),
                  ],
                ),
              ),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const LabeledSection(icon: Icons.home_outlined, label: 'Address'),
                  const SizedBox(height: 8),
                  Text(
                    profile?.addressLine1 != null
                        ? '${profile!.addressLine1}, ${profile.city ?? ''}${profile.state != null ? ', ${profile.state}' : ''}${profile.postalCode != null ? ' - ${profile.postalCode}' : ''}'
                        : 'Not provided yet',
                    style: textTheme.bodyMedium,
                  ),
                  if (profile?.residenceType != null) ...[
                    const SizedBox(height: 4),
                    Text(profile!.residenceType!, style: textTheme.bodySmall),
                  ],
                  const SizedBox(height: 14),
                  const LabeledSection(icon: Icons.work_outline, label: 'Employment & income'),
                  const SizedBox(height: 10),
                  _FieldRow(
                    label: 'Occupation',
                    value: profile?.employmentStatus ?? 'Not provided yet',
                  ),
                  if (profile?.companyName != null)
                    _FieldRow(label: 'Company', value: profile!.companyName!),
                  if (profile?.designation != null)
                    _FieldRow(label: 'Designation', value: profile!.designation!),
                  _FieldRow(
                    label: 'Monthly income',
                    value: profile?.monthlyIncome != null
                        ? Formatters.currency(profile!.monthlyIncome!)
                        : 'Not provided yet',
                  ),
                  if (profile?.additionalIncome != null)
                    _FieldRow(
                        label: 'Additional income',
                        value: Formatters.currency(profile!.additionalIncome!)),
                ],
              ),
            ),
            if (profile?.currentMonthlyEmi != null ||
                profile?.creditCardCount != null ||
                profile?.existingLoansOutstanding != null)
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const LabeledSection(
                        icon: Icons.account_balance_wallet_outlined,
                        label: 'Existing obligations'),
                    const SizedBox(height: 10),
                    if (profile?.currentMonthlyEmi != null)
                      _FieldRow(
                          label: 'Current EMI',
                          value: Formatters.currency(profile!.currentMonthlyEmi!)),
                    if (profile?.creditCardCount != null)
                      _FieldRow(label: 'Credit cards', value: '${profile!.creditCardCount}'),
                    if (profile?.existingLoansOutstanding != null)
                      _FieldRow(
                          label: 'Other loans outstanding',
                          value: Formatters.currency(profile!.existingLoansOutstanding!)),
                  ],
                ),
              ),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const LabeledSection(icon: Icons.account_balance_outlined, label: 'Bank account'),
                  const SizedBox(height: 8),
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
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const LabeledSection(icon: Icons.contact_emergency_outlined, label: 'Nominee'),
                  const SizedBox(height: 8),
                  Text(
                    profile?.nomineeName ?? 'Not provided yet',
                    style: textTheme.bodyMedium,
                  ),
                  if (profile?.nomineeRelationship != null)
                    Text(profile!.nomineeRelationship!, style: textTheme.bodySmall),
                ],
              ),
            ),
            if (profile?.reference1Name != null || profile?.reference2Name != null)
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const LabeledSection(icon: Icons.contacts_outlined, label: 'References'),
                    const SizedBox(height: 10),
                    if (profile?.reference1Name != null)
                      _FieldRow(
                          label: profile?.reference1Relationship ?? 'Reference 1',
                          value: profile!.reference1Name!),
                    if (profile?.reference2Name != null)
                      _FieldRow(
                          label: profile?.reference2Relationship ?? 'Reference 2',
                          value: profile!.reference2Name!),
                  ],
                ),
              ),
            AppCard(
              onTap: () => context.push('/profile/privacy'),
              child: const ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.privacy_tip_outlined),
                title: Text('Privacy settings'),
                trailing: Icon(Icons.chevron_right),
              ),
            ),
            if (EnvConfig.firebaseEnabled)
              AppCard(
                onTap: () => getIt<CustomerAuthRepository>().signOut(),
                child: const ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.logout, color: AppColors.error),
                  title: Text('Sign out', style: TextStyle(color: AppColors.error)),
                ),
              ),
          ];

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: sections.length,
            separatorBuilder: (context, index) => const SizedBox(height: 16),
            itemBuilder: (context, index) => FadeSlideIn(
              delay: Duration(milliseconds: 30 * index),
              child: sections[index],
            ),
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
