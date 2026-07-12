import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/app_card.dart';
import '../../core/widgets/state_views.dart';
import 'profile_providers.dart';

/// Read-only profile summary + navigation to Edit/Privacy Settings.
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
          message: 'Could not load your profile: $error',
          onRetry: () => ref.invalidate(profileOverviewProvider),
        ),
        data: (overview) {
          final user = overview.user;
          final profile = overview.customerProfile;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user.fullName ?? 'Add your name',
                        style: textTheme.titleLarge),
                    if (user.email != null)
                      Text(user.email!, style: textTheme.bodyMedium),
                    if (user.email == null)
                      Text('No email on file', style: textTheme.bodySmall),
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
                          ? '${profile!.addressLine1}, ${profile.city ?? ''}'
                          : 'Not provided yet',
                      style: textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 12),
                    Text('Employment', style: textTheme.labelSmall),
                    Text(profile?.employmentStatus ?? 'Not provided yet',
                        style: textTheme.bodyMedium),
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
            ],
          );
        },
      ),
    );
  }
}
